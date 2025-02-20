// netlify/functions/importWordPressContent.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");

// Dynamic Import for ES Module Compatibility
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
        console.log("WordPress API'ye istek gönderiliyor...");

        const response = await fetch('https://startupsole.com/wp-json/wp/v2/posts?per_page=100');
        
        if (!response.ok) {
            console.error("WordPress API hatası:", response.status, response.statusText);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `WordPress API hatası: ${response.status} ${response.statusText}` }),
            };
        }

        const posts = await response.json();
        console.log(`API'den alınan veri sayısı: ${posts.length}`);

        const blogCollection = collection(db, "blog_articles");

        for (const post of posts) {
            console.log(`Veri Firestore'a ekleniyor: ${post.title.rendered}`);
            
            // Gereksiz alanları filtreleyelim
            const cleanData = {
                title: post.title.rendered,
                content: post.content?.rendered || "",
                link: post.link,
                publishedDate: post.date,
                excerpt: post.excerpt?.rendered || "", // Özet içeriği ekleyelim
                slug: post.slug // SEO dostu URL
            };

            const blogRef = doc(blogCollection, post.id.toString());
            await setDoc(blogRef, cleanData);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Mevcut WordPress içerikleri başarıyla Firebase'e aktarıldı!" }),
        };
    } catch (error) {
        console.error("Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "İçerik aktarımı sırasında bir hata oluştu." }),
        };
    }
};
