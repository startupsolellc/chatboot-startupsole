// netlify/functions/fetchFAQs.js

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

// Kullanıcı mesajında en uygun SSS eşleşmesini bulmak için basit benzerlik kontrolü
const findBestMatch = (userMessage, questions) => {
    let bestMatch = null;
    let highestScore = 0;

    for (const question of questions) {
        const lowerCaseMessage = userMessage.toLowerCase();
        const lowerCaseQuestion = question.toLowerCase();

        // Anahtar kelime tabanlı basit benzerlik skoru
        let score = 0;
        const words = lowerCaseQuestion.split(" ");
        words.forEach(word => {
            if (lowerCaseMessage.includes(word)) {
                score++;
            }
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = question;
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

        const faqCollection = collection(db, "faqs");
        const faqSnapshot = await getDocs(faqCollection);

        const questions = faqSnapshot.docs.map(doc => doc.data().question);
        const bestMatch = findBestMatch(userMessage, questions);

        if (bestMatch) {
            const matchedDoc = faqSnapshot.docs.find(doc => doc.data().question === bestMatch);
            const { question, answer } = matchedDoc.data();
            console.log(`✅ En Uygun SSS Eşleşmesi: ${question}`);

            const responseMessage = `Kullanıcıların sıkça sorduğu bir soru: "${question}". Cevap: "${answer}"`;

            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({ message: responseMessage }),
            };
        }

        console.log("❌ SSS Eşleşmesi Bulunamadı.");
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ message: "Maalesef bu konuda Sıkça Sorulan Sorular arasında bir bilgi bulunamadı." }),
        };

    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "SSS araması sırasında bir hata oluştu." }),
        };
    }
};
