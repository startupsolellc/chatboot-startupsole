const { OpenAI } = require("openai");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
} = require("firebase/firestore/lite");
const { v4: uuidv4 } = require('uuid');

// OpenAI kurulumu
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Firebase kurulumu
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

async function saveSessionHistory(sessionId, messages) {
  const sessionDoc = doc(db, "sessions", sessionId);
  await setDoc(sessionDoc, { messages });
  console.log("💾 Oturum Güncellendi:", sessionId);
}

async function getOpenAIResponse(messages, maxTokens = 300) {
  // temperature'ı biraz düşürüyoruz, max_tokens'ı da kısıyoruz
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", 
    messages: messages,
    max_tokens: maxTokens,
    temperature: 0.4
  });

  return response?.choices?.[0]?.message?.content || "Yanıt alınamadı.";
}

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

    // Veri tabanından FAQ ve Blog makalelerini çek
    const faqCollection = collection(db, "faqs");
    const blogCollection = collection(db, "blog_articles");

    const [faqSnapshot, blogSnapshot] = await Promise.all([
      getDocs(faqCollection),
      getDocs(blogCollection)
    ]);

    const faqs = faqSnapshot.docs.map((doc) => ({
      question: doc.data().question,
      answer: doc.data().answer
    }));

    const blogArticles = blogSnapshot.docs.map((doc) => ({
      title: doc.data().title,
      excerpt: doc.data().excerpt?.slice(0, 200),
      link: doc.data().link
    }));

    // Oturum geçmişini al
    const sessionMessages = await getSessionHistory(sessionId);

    // Kullanıcı mesajını ekle
    if (userMessage) {
      sessionMessages.push({ role: "user", content: userMessage });
    }

    // ----- Kısa ve net cevap için System Prompt oluşturun -----
    // Tüm FAQ ve blog başlıklarını tek tek system mesajı olarak eklemek yerine
    // birleştirerek veya özetleyerek ekleyebilirsiniz.
    
    const faqsText = faqs.map((f, i) => `(${i+1}) Soru: ${f.question} | Cevap: ${f.answer.slice(0,50)}...`).join("\n");
    const blogsText = blogArticles.map((b, i) => `(${i+1}) ${b.title}: ${b.link}`).join("\n");

    const systemPrompt = `
Sen bir sohbet robotusun. Aşağıda Sıkça Sorulan Sorular (FAQ) ve blog makalelerine ait özet/başlıklar bulunuyor.
Kullanıcının sorduğu soruya kısa ve net cevap ver. 
Gerekirse ilgili blog makalesine kısaca yönlendir (sadece en alakalı makalenin bağlantısını ver).
Gereksiz uzun açıklamalardan kaçın, cevabı 2-3 cümleyi geçmeyecek şekilde tut.

=== SSS Listesi (Özet) ===
${faqsText}

=== Blog Makaleleri (Özet) ===
${blogsText}

Cevaplar daima Türkçe olsun ve mümkün olduğu kadar anlaşılır, öz biçimde yanıt ver.
    `.trim();

    // System prompt'u en başa ekleyin (modelin bağlamı olsun)
    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...sessionMessages
    ];

    // OpenAI'den yanıt al
    const aiResponse = await getOpenAIResponse(openAIMessages, 300);

    // Yanıtı sessionMessages'e ekleyip kaydediyoruz
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
