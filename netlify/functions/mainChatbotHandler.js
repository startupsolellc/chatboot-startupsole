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

// ====================== 3. Metni Embedding'e Çevirme (Detaylı Log) ======================
async function getEmbedding(text) {
  // 3.1) Boşluk kontrolü
  if (!text || !text.trim()) {
    console.log("❗ getEmbedding: Metin boş. text=", text);
    return null;
  }

  console.log("🔎 getEmbedding: Metin şu şekilde:", text.slice(0, 100), "...");

  try {
    // 3.2) openai.createEmbedding çağrısı
    console.log("🚀 getEmbedding: createEmbedding çağrılıyor...");
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text
    });
    console.log("🚀 getEmbedding: createEmbedding yanıtı alındı.");

    // 3.3) Yanıt formatı kontrolü
    if (!response || !response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
      console.log("❗ getEmbedding: Embedding yanıtı beklenen formatta değil.");
      return null;
    }

    const [res] = response.data.data;
    if (!res || !res.embedding) {
      console.log("❗ getEmbedding: Embedding alanı yok.");
      return null;
    }

    const embedding = res.embedding;
    console.log("✅ getEmbedding: Embedding oluşturuldu, uzunluk:", embedding.length);
    return embedding;
  } catch (err) {
    console.error("❌ getEmbedding: createEmbedding Hatası:", err.message);
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
    console.log("❗ getOrComputeEmbedding: Embedding için metin yok:", blogDoc.id);
    return null;
  }

  // Eğer zaten embedding kaydetmişsek
  if (data.embedding && Array.isArray(data.embedding)) {
    console.log(`📌 Zaten embedding var: ${blogDoc.id}, uzunluk: ${data.embedding.length}`);
    return data.embedding;
  }

  // Yoksa yeni oluştur
  console.log("🚀 getOrComputeEmbedding: Embedding hesaplanıyor:", blogDoc.id);
  const computedEmbedding = await getEmbedding(textToEmbed);
  if (!computedEmbedding) {
    console.log("❗ getOrComputeEmbedding: Embedding hesaplanamadı:", blogDoc.id);
    return null;
  }

  // Firestore'a yazma
  try {
    await updateDoc(doc(db, "blog_articles", blogDoc.id), {
      embedding: computedEmbedding
    });
    console.log("✅ getOrComputeEmbedding: Embedding Firestore'a kaydedildi:", blogDoc.id);
  } catch (err) {
    console.error("❌ getOrComputeEmbedding: Firestore update hatası:", err.message);
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
    console.log("==== HANDLER BAŞLADI ====");

    let userMessage = "";
    let sessionId = event.headers["session-id"] || uuidv4();

    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.userMessage || userMessage;
      sessionId = body.sessionId || sessionId;
    }

    console.log("📥 Gelen Kullanıcı Mesajı:", userMessage);
    console.log("🆔 Oturum ID:", sessionId);
    console.log("OPENAI_API_KEY (gizli kontrol) uzunluğu:", process.env.OPENAI_API_KEY?.length || 0);

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
      console.log("❗ Hiç blog makalesi yok. Boş veri tabanı.");
    } else {
      console.log(`✅ Blog makalesi sayısı: ${blogSnapshot.docs.length}`);
    }

    // 8.3) Kullanıcının embedding'ini oluştur
    console.log("🚀 Kullanıcının embedding'i oluşturulacak:", userMessage);
    const userEmbedding = await getEmbedding(userMessage);

    if (!userEmbedding) {
      // Embedding null döndü
      console.log("❗ userEmbedding null => Fallback'e gidiyoruz.");
      const fallbackAnswer = "Sorunuz çok kısa veya geçersiz görünüyor. Lütfen daha fazla detay vererek tekrar yazar mısınız?";
      sessionMessages.push({ role: "assistant", content: fallbackAnswer });
      await saveSessionHistory(sessionId, sessionMessages);

      console.log("==== HANDLER BİTTİ ====");
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
    console.log(`✅ Embedding'leri bulunan makale sayısı: ${allBlogDocs.length}`);

    // 8.5) En alakalı doküman(lar)ı bul => threshold: 0.3
    const topDocs = findTopDocuments(userEmbedding, allBlogDocs, 2, 0.3);

    // 8.6) Prompt'a koymak için metin hazırlıyoruz
    let knowledgeBaseText = "";
    if (topDocs.length === 0) {
      knowledgeBaseText = "Maalesef bu konuyla ilgili veritabanımızda yeterince alakalı bir makale bulunamadı.";
    } else {
      topDocs.forEach((docObj, index) => {
        const { title, excerpt, content, link } = docObj.data;
        knowledgeBaseText += `
          [${index + 1}]
          Başlık: ${title}
          İçerik: ${ (content?.slice(0, 300) || excerpt?.slice(0, 300) || "").replace(/\n/g, " ") }
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

    console.log("🚀 ChatCompletion'e gönderilecek mesajlar:", JSON.stringify(openAIMessages, null, 2));
    const aiResponse = await getOpenAIResponse(openAIMessages, 400);

    let finalAnswer = aiResponse.trim();
    if (!finalAnswer) {
      finalAnswer = "Veritabanında bu konuyla ilgili bilgi bulunamadı.";
    }

    // Asistan yanıtını ekle
    sessionMessages.push({ role: "assistant", content: finalAnswer });
    await saveSessionHistory(sessionId, sessionMessages);

    console.log("==== HANDLER BİTTİ ====");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "session-id": sessionId,
      },
      body: JSON.stringify({ message: sessionMessages, sessionId }),
    };
  } catch (error) {
    console.error("❌ Handler'ın dış catch bloğunda hata:", error.message, error.stack);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ error: `Sunucu hatası: ${error.message}` }),
    };
  }
};
