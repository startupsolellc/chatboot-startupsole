// netlify/functions/openaiFirebaseProxy.js 

const { OpenAI } = require("openai");
const { initializeApp } = require("firebase/app");
const { 
    getFirestore, 
    collection, 
    getDocs 
} = require("firebase/firestore/lite"); 

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

exports.handler = async (event, context) => {
  try {
    let userMessage = "Merhaba, nasıl yardımcı olabilirim?";

    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.message || userMessage;
    }

    console.log("📥 Kullanıcı Mesajı:", userMessage);

    // Firebase'den Hem SSS Hem de Blog Verilerini Çek
    const faqCollection = collection(db, "faqs"); 
    const blogCollection = collection(db, "blog_articles");

    const faqSnapshot = await getDocs(faqCollection);
    const blogSnapshot = await getDocs(blogCollection);

    const faqs = faqSnapshot.docs.map((doc) => doc.data());
    const blogArticles = blogSnapshot.docs.map((doc) => doc.data());

    console.log("📂 Firebase'den Alınan SSS Verileri:", faqs); 
    console.log("📂 Firebase'den Alınan Blog Verileri:", blogArticles);

    console.log("🚦 OpenAI'ye Gönderilen Mesajlar:", {
        role: "system",
        content: `SSS: ${JSON.stringify(faqs)} Blog: ${JSON.stringify(blogArticles)}`
    });

    // OpenAI'ye Sistem Mesajı ve Kullanıcı Mesajını Gönder
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: userMessage },
        { 
          role: "system", 
          content: `Lütfen sadece aşağıdaki verilere dayanarak cevap ver. Eğer uygun bilgi yoksa 'Bu konuda bilgim yok' de. SSS: ${JSON.stringify(faqs)} Blog: ${JSON.stringify(blogArticles)}` 
        },
      ],
    });

    console.log("🧠 OpenAI Yanıtı:", response);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({ message: response.choices[0].message.content }),
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
