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

// ====================== 0. OpenAI ve Firebase Kurulumu ======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Env'de tanımlı olmalı
});

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

// ====================== 1. Oturum Geçmişini Getirme ======================
async function getSessionHistory(sessionId) {
  const sessionDoc = doc(db, "sessions", sessionId);
  const sessionSnapshot = await getDoc(sessionDoc);
  if (sessionSnapshot.exists()) {
    console.log("📂 Mevcut Oturum Bulundu:", sessionId);
    const messages = sessionSnapshot.data().messages || [];
    return messages.slice(-10); // Son 10 mesaj
  }
  console.log("🆕 Yeni Oturum Oluşturuluyor:", sessionId);
  await setDoc(sessionDoc, { messages: [] });
  return [];
}

// ====================== 2. Oturum Geçmişini Kaydetme ======================
async function saveSessionHistory(sessionId, messages) {
  const sessionDoc = doc(db, "sessions", sessionId);
  await setDoc(sessionDoc, { messages });
  console.log("💾 Oturum Güncellendi:", sessionId);
}

// ====================== 3. Metni Embedding'e Çevirme ======================
async function getEmbedding(text) {
  if (!text || !text.trim()) {
    console.log("❗ Embedding alınacak metin boş.");
    return null;
  }
  console.log("🔎 Embedding alınacak metin:", text.slice(0, 80), "...");

  try {
    // OpenAI'nin "createEmbedding" metodunu kullanıyoruz (openai@4.x ve üstü)
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text,
    });
    const [res] = response.data.data;
    const embedding = res.embedding;
    console.log("✅ Embedding oluşturuldu. Vektör uzunluğu:", embedding.length);
    return embedding;
  } catch (err) {
    console.error("❌ Embedding oluşturulurken hata:", err.message);
    return null;
  }
}

// ====================== 4. Belgedeki Embedding'i Al veya Hesapla ======================
async function getOrComputeEmbedding(blogDoc) {
  const data = blogDoc.data();
  if (!data) {
    console.log("❗ Blog dokümanı boş:", blogDoc.id);
    return null;
  }

  // content -> excerpt -> title öncelikli
  const textToEmbed = (data.content || "").trim()
    || (data.excerpt || "").trim()
    || (data.title || "").trim();

  if (!textToEmbed) {
    console.log("❗ Embedding için kullanılacak metin yok:", blogDoc.id);
    return null;
  }

  // Zaten embedding var mı?
  if (data.embedding && Array.isArray(data.embedding)) {
    console.log(`📌 Mevcut embedding bulundu: ${blogDoc.id}, uzunluk: ${data.embedding.length}`);
    return data.embedding;
  }

  // Yoksa yeni oluşturup Firestore'a kaydedelim
  const computedEmbedding = await getEmbedding(textToEmbed);
  if (!computedEmbedding) {
    console.log("❗ Embedding oluşturulamadı:", blogDoc.id);
    return null;
  }

  try {
    await updateDoc(doc(db, "blog_articles", blogDoc.id), {
      embedding: computedEmbedding
    });
    console.log("✅ Firestore'a embedding kaydedildi:", blogDoc.id);
  } catch (err) {
    console.error("❌ Firestore'a embedding kaydedilirken hata:", err.message);
  }

  return computedEmbedding;
}

// ====================== 5. Cosine Similarity ======================
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
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// ====================== 6. En Benzer Doküman(lar)ı Bulma ======================
function findTopDocuments(userEmbedding, allDocs, topK = 2, threshold = 0.3) {
  const scoredDocs = allDocs.map(d => {
    const sim = cosineSimilarity(userEmbedding, d.embedding);
    return { ...d, similarity: sim };
  });

  // Her dokümanın benzerlik skorunu loglayalım
  scoredDocs.forEach(doc => {
    console.log(`📝 Doc ID: ${doc.id}, Benzerlik: ${doc.similarity.toFixed(3)}`);
  });

  // Skora göre büyükten küçüğe sırala
  scoredDocs.sort((a, b) => b.similarity - a.similarity);

  // En yüksek benzerlikteki topK dokümanı al, threshold üstünde
  const topDocs = scoredDocs.slice(0, topK).filter(doc => doc.similarity >= threshold);

  console.log("🔍 Eşik Değer:", threshold, "Seçilen Dokümanlar:", topDocs.map(d => d.id));
  return topDocs;
}

// ====================== 7. OpenAI'den Yanıt Alma ======================
async function getOpenAIResponse(messages, maxTokens = 400) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    });
    const content = response?.choices?.[0]?.message?.content;
    console.log("🧠 OpenAI cevabı:", content);
    return content || "";
  } catch (err) {
    console.error("❌ OpenAI'den yanıt alınırken hata:", err.message);
    return "";
  }
}

// ====================== 8. Lambda Handler (Ana Fonksiyon) ======================
exports.handler = async (event, context) => {
  try {
    let userMessage = "";
    let sessionId = event.headers["session-id"] || uuidv4();

    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.userMessage || userMessage;
      sessionId = body.sessionId || sessionId;
    }

    console.log("📥 Kullanıcı Mesajı:", userMessage);
    console.log("🆔 Oturum ID:", sessionId);

    // 8.1) Oturum geçmişini al
    const sessionMessages = await getSessionHistory(sessionId);

    // Kullanıcı mesajını ekle
    if (userMessage) {
      sessionMessages.push({ role: "user", content: userMessage });
    }

    // 8.2) Firestore'dan blog makalelerini çek
    const blogCollection = collection(db, "blog_articles");
    const blogSnapshot = await getDocs(blogCollection);

    if (blogSnapshot.empty) {
      console.log("❗ Hiç blog makalesi yok.");
    }

    // 8.3) Kullanıcının embedding'ini oluştur
    const userEmbedding = await getEmbedding(userMessage);

    if (!userEmbedding) {
      // Kullanıcı mesajı boş veya embedding API hata verdi
      const fallbackAnswer = "Sorunuz çok kısa veya geçersiz görünüyor. Lütfen biraz daha detaylı tekrar yazar mısınız?";
      sessionMessages.push({ role: "assistant", content: fallbackAnswer });
      await saveSessionHistory(sessionId, sessionMessages);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "session-id": sessionId,
        },
        body: JSON.stringify({ message: sessionMessages, sessionId }),
      };
    }

    // 8.4) Her blog makalesi için embedding'i al veya oluştur
    let allBlogDocs = [];
    for (let docSnap of blogSnapshot.docs) {
      const embedding = await getOrComputeEmbedding(docSnap);
      if (embedding) {
        allBlogDocs.push({
          id: docSnap.id,
          data: docSnap.data(),
          embedding,
        });
      }
    }

    // 8.5) En alakalı doküman(lar)ı bul
    // threshold: 0.3 => Testte kolay eşleşme sağlamak için
    const topDocs = findTopDocuments(userEmbedding, allBlogDocs, 2, 0.3);

    // 8.6) Prompt'a koymak için metin hazırlıyoruz
    let knowledgeBaseText = "";
    if (topDocs.length === 0) {
      // Hiç bir doküman eşiği aşamadı
      knowledgeBaseText = "Maalesef bu konuyla ilgili veritabanında yeterince alakalı bir makale bulunamadı.";
    } else {
      topDocs.forEach((docObj, index) => {
        const { title, excerpt, content, link } = docObj.data;
        // content veya excerpt'ü kısaltmak istersen buradan yapabilirsin
        knowledgeBaseText += `
        [${index + 1}]
        Başlık: ${title}
        İçerik: ${content?.slice(0, 300) || excerpt?.slice(0, 300) || ""}
        Link: ${link || ""}
        `;
      });
    }

    // 8.7) System Prompt oluştur
    const systemPrompt = `
Sen bir destek chatbotusun. Aşağıdaki bilgiler veritabanındaki blog makalelerinden alınmıştır.
Kullanıcının sorusuna bu bilgiler ışığında, kısa ve öz şekilde yanıt ver. 
Gerekiyorsa makale linkine yönlendir. 
Eğer içerik bulunamadıysa "Veritabanında bu konuyla ilgili bilgi bulunamadı" de.
Cevabın en fazla 3-4 cümle olsun.

=== İlgili Makale Bilgisi ===
${knowledgeBaseText}
`.trim();

    // 8.8) OpenAI'ye mesajları gönder
    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...sessionMessages,
    ];

    // 8.9) Yanıtı al
    const aiResponse = await getOpenAIResponse(openAIMessages, 400);

    let finalAnswer = aiResponse.trim();
    if (!finalAnswer) {
      finalAnswer = "Veritabanında bu konuyla ilgili bilgi bulunamadı.";
    }

    // Asistan yanıtını ekle
    sessionMessages.push({ role: "assistant", content: finalAnswer });
    await saveSessionHistory(sessionId, sessionMessages);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "session-id": sessionId,
      },
      body: JSON.stringify({ message: sessionMessages, sessionId }),
    };
  } catch (error) {
    console.error("❌ Hata Detayı:", error.message, error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ error: `Sunucu hatası: ${error.message}` }),
    };
  }
};
