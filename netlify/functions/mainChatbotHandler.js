// netlify/functions/mainChatbotHandler.js

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

// Kullanıcı mesajına en yakın içerikleri bulmak için benzerlik skoru hesapla
const findRelevantContent = (userMessage, contents, key) => {
    return contents
        .map((content) => {
            const score = content[key].toLowerCase().split(" ").filter(word => userMessage.toLowerCase().includes(word)).length;
            return { ...content, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // En yüksek skorlu ilk 5 içeriği al
};

exports.handler = async (event, context) => {
  try {
    let userMessage = "Merhaba, nasıl yardımcı olabilirim?";

    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      userMessage = body.userMessage || userMessage;
    }

    console.log("📥 Kullanıcı Mesajı:", userMessage);

    // Firebase'den Hem SSS Hem de Blog Verilerini Çek
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

    console.log("📂 Firebase'den Alınan SSS Verileri:", faqs); 
    console.log("📂 Firebase'den Alınan Blog Verileri:", blogArticles);

    const relevantFaqs = findRelevantContent(userMessage, faqs, 'question');
    const relevantBlogs = findRelevantContent(userMessage, blogArticles, 'title');

    console.log("🔍 İlgili SSS'ler:", relevantFaqs);
    console.log("🔍 İlgili Bloglar:", relevantBlogs);

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { 
                role: "system", 
                content: `Sen Startupsole.com'un resmi chatbotusun. Kullanıcılarla doğrudan ve samimi bir şekilde konuş. Yanıt verirken linkleri ilgili anahtar kelimelere veya "bu içeriğe" gibi ifadelere gömülü HTML formatında ver. Örneğin: <a href='https://example.com' target='_blank'>bu içeriğe</a> veya <a href='https://startupsole.com/ein-nedir/' target='_blank'>EIN Nedir?</a>. SSS: ${JSON.stringify(relevantFaqs)} Blog: ${JSON.stringify(relevantBlogs)}`
            },
            { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.6,
    });

    const aiResponse = response?.choices?.[0]?.message?.content || "Yanıt alınamadı.";

    console.log("🧠 OpenAI Yanıtı:", aiResponse);

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({ message: aiResponse }),
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
