// netlify/functions/fetchBlogArticles.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// Firebase yapılandırması
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

// Kullanıcı mesajında en uygun blog makalesi eşleşmesini bulmak için basit benzerlik kontrolü
const findBestBlogMatch = (userMessage, articles) => {
    let bestMatch = null;
    let highestScore = 0;

    for (const article of articles) {
        const { title, content, link } = article;
        const lowerCaseMessage = userMessage.toLowerCase();

        // Blog başlığı ve içeriğine göre benzerlik skoru hesapla
        let score = 0;
        const searchableText = `${title} ${content}`.toLowerCase();
        const words = lowerCaseMessage.split(" ");
        words.forEach(word => {
            if (searchableText.includes(word)) {
                score++;
            }
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = article;
        }
    }

    return bestMatch;
};

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({ error: "Yalnızca POST istekleri kabul edilmektedir." }),
            };
        }

        const { userMessage } = JSON.parse(event.body || '{}');
        if (!userMessage) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({ error: "Geçersiz veya boş kullanıcı mesajı." }),
            };
        }

        console.log("📥 Kullanıcı Mesajı:", userMessage);

        const blogCollection = collection(db, "blog_articles");
        const blogSnapshot = await getDocs(blogCollection);

        const articles = blogSnapshot.docs.map(doc => doc.data());
        const bestMatch = findBestBlogMatch(userMessage, articles);

        if (bestMatch) {
            const { title, link } = bestMatch;
            console.log(`✅ En Uygun Blog Makalesi: ${title}`);

            const responseMessage = `Kullanıcıların merak ettiği konuda faydalı bir makalemiz var: "${title}". Daha fazla bilgi almak için lütfen [buraya tıklayın](${link}).`;

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({ message: responseMessage }),
            };
        }

        console.log("❌ Blog Makalesi Bulunamadı.");
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ message: "Maalesef bu konuda blog makaleleri arasında bir bilgi bulunamadı." }),
        };

    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Blog makaleleri araması sırasında bir hata oluştu." }),
        };
    }
};
