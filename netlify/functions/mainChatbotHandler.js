// netlify/functions/mainChatbotHandler.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// API URL'leri
const API_BASE_URL = 'https://startupsolechatboot.netlify.app/.netlify/functions';
const FAQS_API = `${API_BASE_URL}/fetchFAQs`;
const BLOG_ARTICLES_API = `${API_BASE_URL}/fetchBlogArticles`;

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

        // 1. Adım: SSS API çağrısı
        let response = await fetch(FAQS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage })
        });
        let data = await response.json();
        if (data.message && !data.message.includes("bulunamadı")) {
            return {
                statusCode: 200,
                body: JSON.stringify(data),
            };
        }

        // 2. Adım: Blog Makaleleri API çağrısı
        response = await fetch(BLOG_ARTICLES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage })
        });
        data = await response.json();
        if (data.message && !data.message.includes("bulunamadı")) {
            return {
                statusCode: 200,
                body: JSON.stringify(data),
            };
        }

        // Hiçbir API yanıt vermezse genel mesaj
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Üzgünüm, bu konuda yardımcı olamıyorum." }),
        };

    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({ error: "Ana chatbot işleyicisi çalışırken bir hata oluştu." }),
        };
    }
};
