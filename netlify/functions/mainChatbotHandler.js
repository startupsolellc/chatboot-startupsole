const { OpenAI } = require("openai");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc
} = require("firebase/firestore/lite");
const { v4: uuidv4 } = require('uuid');

// ========== OpenAI Kurulumu ==========
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========== Firebase Kurulumu ==========
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ========== 1. Oturum Geçmişini Getirme ==========
async function getSessionHistory(sessionId) {
  const sessionDoc = doc(db, "sessions", sessionId);
  const sessionSnapshot = await getDoc(sessionDoc);
  if (sessionSnapshot.exists()) {
    console.log("📂 Mevcut Oturum Bulundu:", sessionId);
    const messages = sessionSnapshot.data().messages || [];
    // Sadece son 10 mesajı tutuyoruz
    return messages.slice(-10);
  }
  console.log("🆕 Yeni Oturum Oluşturuluyor:", sessionId);
  await setDoc(sessionDoc, { messages: [] });
  return [];
}

// ========== 2. Oturum Geçmişini Kaydetme ==========
async function saveSessionHistory(sessionId, messages) {
  const sessionDoc = doc(db, "sessions", sessionId);
  await setDoc(sessionDoc, { messages });
  console.log("💾 Oturum Güncellendi:", sessionId);
}

// ========== 3. Metni Embedding'e Çevirme ==========
async function getEmbedding(text) {
  // OpenAI Embedding endpoint
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002", // En popüler embedding modeli
    input: text
  });
  const embedding = embeddingResponse.data.data[0].embedding;
  return embedding;
}

// ========== 4. Belgedeki Embedding'i Al veya Hesapla ==========
async function getOrComputeEmbedding(blogDoc) {
  // blogDoc: Firestore'dan aldığımız döküman (title, content, embedding vs.)
  let data = blogDoc.data();
  // Embedding alanı var mı, yok mu bak
  if (!data.embedding) {
    // Belge içeriğinden (veya excerpt) embedding oluştur
    const textToEmbed = data.excerpt || data.title || "";
    if (!textToEmbed) {
      return null; // Boş metin varsa embedding hesaplamıyoruz
    }
    const computedEmbedding = await getEmbedding(textToEmbed);
    // Firestore'da bu embedding'i saklayalım
    const ref = doc(db, "blog_articles", blogDoc.id);
    await updateDoc(ref, { embedding: computedEmbedding });
    console.log(`✅ Embedding oluşturuldu ve kaydedildi: ${blogDoc.id}`);
    return computedEmbedding;
  } else {
    return data.embedding;
  }
}

// ========== 5. Vektörel Benzerlik (Cosine Similarity) ==========
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return dotProduct / (normA * normB);
}

// ========== 6. En Benzer Doküman(lar)ı Bulma ==========
function findTopDocuments(userEmbedding, allDocs, topK = 2, threshold = 0.75) {
  // allDocs: { id, data, embedding } formatında doküman listesi
  // userEmbedding: kullanıcı sorgusunun embedding'i
  // topK: en benzer kaç dokümanı döndüreceğiz
  // threshold: asgari benzerlik eşiği

  // Her dokümanın benzerliğini hesapla
  const scoredDocs = allDocs.map(d => {
    const sim = cosineSimilarity(userEmbedding, d.embedding);
    return { ...d, similarity: sim };
  });

  // Benzerliğe göre sırala
  scoredDocs.sort((a, b) => b.similarity - a.similarity);

  // En yüksek benzerlikteki topK dokümanları al
  const topDocs = scoredDocs.slice(0, topK).filter(doc => doc.similarity >= threshold);

  return topDocs;
}

// ========== 7. OpenAI'den Yanıt Alma ==========
async function getOpenAIResponse(messages, maxTokens = 400) {
  // "gpt-4o-mini" modelini kullanıyoruz
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    max_tokens: maxTokens,
    temperature: 0.4 // Birazcık yaratıcılığı açık bırakıyoruz
  });

  return response?.choices?.[0]?.message?.content || "Yanıt alınamadı.";
}

// ========== 8. Lambda Handler ==========
exports.handler = async (event, context) => {
  try {
    let userMessage = "";
    let sessionId = event.headers['session-id'] || uuidv4();

    // Eğer POST isteğiyse, body içinden verileri alıyoruz
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.userMessage || userMessage;
      sessionId = body.sessionId || sessionId;
    }

    console.log("📥 Kullanıcı Mesajı:", userMessage);
    console.log("🆔 Oturum ID:", sessionId);

    // Oturum geçmişini al
    const sessionMessages = await getSessionHistory(sessionId);

    // Kullanıcı mesajını ekle
    if (userMessage) {
      sessionMessages.push({ role: "user", content: userMessage });
    }

    // 8.1) Firestore'dan blog makalelerini çek
    // SSS'lerin de embedding'leri varsa aynı mantıkla kullanabilirsiniz
    const blogCollection = collection(db, "blog_articles");
    const blogSnapshot = await getDocs(blogCollection);

    // 8.2) Kullanıcı sorgusunun embedding'ini al
    const userEmbedding = await getEmbedding(userMessage);

    // 8.3) Blog dökümanlarının embedding'lerini toplayalım
    let allBlogDocs = [];
    for (let docSnap of blogSnapshot.docs) {
      const embedding = await getOrComputeEmbedding(docSnap); 
      if (embedding) {
        // excerpt, title, link gibi alanları da saklayalım
        allBlogDocs.push({
          id: docSnap.id,
          data: docSnap.data(),
          embedding: embedding
        });
      }
    }

    // 8.4) En alakalı 2 dokümanı bulalım
    const topDocs = findTopDocuments(userEmbedding, allBlogDocs, 2, 0.7);
    console.log("En alakalı dokümanlar:", topDocs.map(d => d.id));

    // 8.5) Bu dokümanları system prompt'a koymak için metin hazırlayalım
    // En alakalı dokümanların excerpt veya kısa özetini modele veriyoruz
    let knowledgeBaseText = "";
    topDocs.forEach((docObj, index) => {
      const { title, excerpt, link } = docObj.data;
      // excerpt yeterince kısa değilse kesebilirsiniz
      knowledgeBaseText += `
      [${index + 1}]
      Başlık: ${title}
      Özet: ${excerpt}
      Link: ${link}
      `;
    });

    // Eğer hiçbir doküman threshold'ü geçmezse, "içerik bulamadık" benzeri
    if (topDocs.length === 0) {
      knowledgeBaseText = `
      Bu kullanıcının sorusuna dair veritabanımda yeterince ilgili bir makale bulamadım.
      `;
    }

    // 8.6) System Prompt oluştur
    const systemPrompt = `
Sen bir destek chatbotusun. Aşağıdaki bilgiler veritabanındaki blog makalelerinden alınmıştır.
Kullanıcının sorusuna bu bilgiler ışığında, kısa ve öz şekilde yanıt ver. 
Gerekiyorsa makale linkine yönlendir. Eğer içerik bulamadıysan "veritabanında bu konuyla ilgili bilgi bulunamadı" de.
Cevabın en fazla 3-4 cümle olsun.

=== İlgili Makale Bilgisi ===
${knowledgeBaseText}

` .trim();

    // 8.7) OpenAI mesajlarını oluştur
    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...sessionMessages
    ];

    // 8.8) OpenAI'den yanıt al
    const aiResponse = await getOpenAIResponse(openAIMessages, 400);

    // Asistan yanıtını ekle
    if (aiResponse) {
      sessionMessages.push({ role: "assistant", content: aiResponse });
      await saveSessionHistory(sessionId, sessionMessages);
    }

    console.log("🧠 OpenAI Tam Yanıt:", aiResponse);
    console.log("📜 Mesaj Geçmişi:", sessionMessages);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "session-id": sessionId
      },
      body: JSON.stringify({ message: sessionMessages, sessionId }),
    };

  } catch (error) {
    console.error("❌ Hata Detayı:", error.message, error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ error: `Sunucu hatası: ${error.message}` }),
    };
  }
};
