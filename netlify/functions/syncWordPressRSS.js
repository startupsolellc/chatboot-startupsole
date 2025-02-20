// netlify/functions/syncWordPressRSS.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, getDoc } = require("firebase/firestore");
const Parser = require("rss-parser"); // RSS Feed için parser kullanıyoruz

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
const rssParser = new Parser();

exports.handler = async (event, context) => {
    try {
        console.log("WordPress RSS Feed'den veri alınıyor...");

        const feed = await rssParser.parseURL('https://startupsole.com/feed/');

        const blogCollection = collection(db, "blog_articles");
        let newPostsCount = 0;

        for (const item of feed.items) {
            const docId = item.link.split('/').filter(Boolean).pop(); // Slug kullanarak ID oluştur
            const blogRef = doc(blogCollection, docId);

            const docSnapshot = await getDoc(blogRef);
            if (!docSnapshot.exists()) {
                console.log(`Yeni içerik ekleniyor: ${item.title}`);
                await setDoc(blogRef, {
                    title: item.title,
                    content: item.contentSnippet || item.content,
                    link: item.link,
                    publishedDate: item.isoDate,
                    excerpt: item.contentSnippet,
                    slug: docId,
                });
                newPostsCount++;
            } else {
                console.log(`Zaten mevcut: ${item.title}`);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `${newPostsCount} yeni içerik eklendi!` }),
        };
    } catch (error) {
        console.error("Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "RSS feed üzerinden içerik senkronizasyonu sırasında bir hata oluştu." }),
        };
    }
};
