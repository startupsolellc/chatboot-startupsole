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
        const response = await fetch('https://startupsole.com/wp-json/wp/v2/posts?per_page=100');
        const posts = await response.json();

        const blogCollection = collection(db, "blog_articles");

        for (const post of posts) {
            const blogRef = doc(blogCollection, post.id.toString());
            await setDoc(blogRef, {
                title: post.title.rendered,
                content: post.content.rendered,
                link: post.link,
                publishedDate: post.date,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Mevcut WordPress içerikleri başarıyla Firebase'e aktarıldı!" }),
        };
    } catch (error) {
        console.error("Hata Detayı:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "İçerik aktarımı sırasında bir hata oluştu." }),
        };
    }
};
