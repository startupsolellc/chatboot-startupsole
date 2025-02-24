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

async function getSessionHistory(sessionId) {
    const sessionDoc = doc(db, "sessions", sessionId);
    const sessionSnapshot = await getDoc(sessionDoc);
    if (sessionSnapshot.exists()) {
        console.log("📂 Mevcut Oturum Bulundu:", sessionId);
        const messages = sessionSnapshot.data().messages || [];
        return messages.slice(-10); // Sadece son 10 mesajı al
    }
    console.log("🆕 Yeni Oturum Oluşturuluyor:", sessionId);
    await setDoc(sessionDoc, { messages: [] });
    return [];
}

async function saveSessionHistory(sessionId, messages) {
    const sessionDoc = doc(db, "sessions", sessionId);
    await setDoc(sessionDoc, { messages }); // updateDoc yerine setDoc kullanıldı
    console.log("💾 Oturum Güncellendi:", sessionId);
}

async function getOpenAIResponse(messages, maxTokens = 600) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.6
    });

    return response?.choices?.[0]?.message?.content || "Yanıt alınamadı.";
}

exports.handler = async (event, context) => {
  try {
    let userMessage = "Merhaba, nasıl yardımcı olabilirim?";
    let sessionId = event.headers['session-id'] || uuidv4();

    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.userMessage || userMessage;
      sessionId = body.sessionId || sessionId;
    }

    console.log("📥 Kullanıcı Mesajı:", userMessage);
    console.log("🆔 Oturum ID:", sessionId);

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

    const sessionMessages = await getSessionHistory(sessionId);
    if (userMessage) {
        sessionMessages.push({ role: "user", content: userMessage });
    }

    const aiResponse = await getOpenAIResponse([
        ...sessionMessages,
        ...faqs.map(faq => ({ role: "system", content: `Sıkça Sorulan Soru: ${faq.question} - Cevap: ${faq.answer.slice(0, 100)}...` })),
        ...blogArticles.map(blog => ({ role: "system", content: `Konu hakkında daha fazla bilgi almak için ${blog.title} makalesini ziyaret edebilirsiniz: ${blog.link}` }))
    ]);

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
        body: JSON.stringify({ message: aiResponse, sessionId }),
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
