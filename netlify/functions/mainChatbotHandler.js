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

// ========== 0. OpenAI ve Firebase Kurulumu ==========

// Bu kodun çalışması için "npm install openai firebase" (sürüm 4+)
// ve ortam değişkenlerinde OPENAI_API_KEY, FIREBASE_* değerlerinin
// doğru ayarlandığından emin ol.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

// ========== 3. Metni Embedding'e Çevirme (GÜNCELLENDİ) ==========
async function getEmbedding(text) {
  if (!text || !text.trim()) {
    return null;
  }
  console.log("🔎 Embedding alınacak metin:", text.slice(0, 60), "...");

  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text,
    });
    const [res] = response.data.data;
    const embedding = res.embedding;
    console.log("✅ Embedding oluşturuldu, vektör uzunluğu:", embedding.length);
    return embedding;
  } catch (err) {
    console.error("❌ Embedding oluşturulurken hata:", err.message);
    return null;
  }
}

// ========== 4. Belgedeki Embedding'i Al veya Hesapla ==========
async function getOrComputeEmbedding(blogDoc) {
  const data = blogDoc.data();
  if (!data) return null;

  // Metin olarak "excerpt" veya "title" kullanıyoruz
  const textToEmbed = data.excerpt || data.title || "";
  if (!textToEmbed.trim()) {
    return null;
  }

  // Zaten embedding var mı?
  if (data.embedding && Array.isArray(data.embedding)) {
    // Konsolda görelim
    console.log(`📌 Mevcut embedding bulundu: ${blogDoc.id}, uzunluk: ${data.embedding.length}`);
    return data.embedding;
  }

  // Yoksa yeni oluşturup Firestore'a kaydedelim
  const computedEmbedding = await getEmbedding(textToEmbed);
  if (!computedEmbedding) {
    return null;
  }

  try {
    await updateDoc(doc(db, "blog_articles", blogDoc.id), {
      embedding: computedEmbedding
    });
    console.log("✅ Embedding kaydedildi Firestore'a:", blogDoc.id);
  } catch (err) {
    console.error("❌ Firestore'a embedding kaydedilirken hata:", err.message);
    // embedding var ama kaydedemedik, yine de döndürelim
  }
  return computedEmbedding;
}

// ========== 5. Cosine Similarity ==========
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
function findTopDocuments(userEmbedding, allDocs, topK = 2, threshold = 0.7) {
  const scoredDocs = allDocs.map(d => {
    const sim = cosineSimilarity(userEmbedding, d.embedding);
    return { ...d, similarity: sim };
  });

  scoredDocs.sort((a, b) => b.similarity - a.similarity);
  // En yüksek benzerlikteki topK dokümanları al, threshold'ün üstünde
  const topDocs = scoredDocs.slice(0, topK).filter(doc => doc.similarity >= threshold);

  return topDocs;
}

// ========== 7. OpenAI'den Yanıt Alma ==========
async function getOpenAIResponse(messages, maxTokens = 400) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.4
    });
    const content = response?.choices?.[0]?.message?.content;
    console.log("🧠 OpenAI cevabı:", content);
    return content || "Yanıt alınamadı.";
  } catch (err) {
    console.error("❌ OpenAI'den yanıt alınırken hata:", err.message);
    return "OpenAI cevabı alınamadı.";
  }
}

// ========== 8. Lambda Handler (Ana Fonksiyon) ==========
exports.handler = async (event, context) => {
  try {
    let userMessage = "";
    let sessionId = event.headers['session-id'] || uuidv4();

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
      console.log("❗Hiç blog makalesi bulunamadı, veritabanı boş olabilir.");
    }

    // 8.3) Kullanıcının embedding'ini oluştur
    const userEmbedding = await getEmbedding(userMessage);
    if (!userEmbedding) {
      // Kullanıcının metni yok veya embedding oluşturulamadı
      // Yine de bir cevap vermemiz gerekir
      const fallbackAnswer = "Anladım. Başka bir konuda yardımcı olabilir miyim?";
      sessionMessages.push({ role: "assistant", content: fallbackAnswer });
      await saveSessionHistory(sessionId, sessionMessages);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "session-id": sessionId
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
          embedding
        });
      }
    }

    // 8.5) En alakalı doküman(lar)ı bul
    const topDocs = findTopDocuments(userEmbedding, allBlogDocs, 2, 0.7);
    console.log("🔍 En alakalı dokümanlar:", topDocs.map(d => d.id));

    // 8.6) Prompt'a koymak için metin hazırlıyoruz
    let knowledgeBaseText = "";
    if (topDocs.length === 0) {
      knowledgeBaseText = "Veritabanında bu soruyla ilgili yeterince alakalı bir makale bulunamadı.";
    } else {
      topDocs.forEach((docObj, index) => {
        const { title, excerpt, link } = docObj.data;
        knowledgeBaseText += `
        [${index + 1}]
        Başlık: ${title}
        Özet: ${excerpt}
        Link: ${link}
        `;
      });
    }

    // 8.7) System Prompt oluştur
    const systemPrompt = `
Sen bir destek chatbotusun. Aşağıdaki bilgiler veritabanındaki blog makalelerinden alınmıştır.
Kullanıcının sorusuna bu bilgiler ışığında, kısa ve öz şekilde yanıt ver. 
Gerekiyorsa makale linkine yönlendir. 
Eğer içerik bulunamadıysa "veritabanında bu konuyla ilgili bilgi bulunamadı" de.
Cevabın en fazla 3-4 cümle olsun.

=== İlgili Makale Bilgisi ===
${knowledgeBaseText}
`.trim();

    // 8.8) OpenAI mesajlarını oluştur
    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...sessionMessages
    ];

    // 8.9) Yanıt al
    const aiResponse = await getOpenAIResponse(openAIMessages, 400);

    // Asistan yanıtını ekleyip kaydediyoruz
    if (aiResponse) {
      sessionMessages.push({ role: "assistant", content: aiResponse });
      await saveSessionHistory(sessionId, sessionMessages);
    }

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
