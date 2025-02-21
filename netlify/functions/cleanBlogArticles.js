// netlify/functions/cleanBlogArticles.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");
const { JSDOM } = require('jsdom');

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

// HTML içeriğini düz metne dönüştüren yardımcı fonksiyon
const stripHtml = (html) => {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || "";
};

exports.handler = async (event, context) => {
    try {
        console.log("📦 Blog içerikleri temizleme işlemi başlatıldı...");

        const blogCollection = collection(db, "blog_articles");
        const blogSnapshot = await getDocs(blogCollection);

        const totalBlogs = blogSnapshot.size;
        console.log(`🔍 ${totalBlogs} adet blog içeriği bulundu.`);

        let cleanedCount = 0;

        for (const docSnapshot of blogSnapshot.docs) {
            const blogData = docSnapshot.data();
            const { content, excerpt } = blogData;

            const cleanContent = content ? stripHtml(content) : "";
            const cleanExcerpt = excerpt ? stripHtml(excerpt) : "";

            await updateDoc(doc(blogCollection, docSnapshot.id), {
                content: cleanContent,
                excerpt: cleanExcerpt,
            });

            cleanedCount++;
            console.log(`✅ Temizlendi: ${docSnapshot.id}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Toplam ${cleanedCount} blog içeriği başarıyla temizlendi!` }),
        };
    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Blog içerikleri temizleme sırasında bir hata oluştu." }),
        };
    }
};
