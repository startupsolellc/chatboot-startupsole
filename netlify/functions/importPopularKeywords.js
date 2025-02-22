// netlify/functions/importPopularKeywords.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const xlsx = require('xlsx');

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

exports.handler = async (event, context) => {
    try {
        console.log("📦 Popüler Anahtar Kelimeler ve Makale Linkleri URL'den Yükleniyor...");

        // Excel dosyasını URL üzerinden indirme
        const fileUrl = 'https://startupsole.com/wp-content/uploads/2025/02/keywords_better_docs.xlsx';
        const response = await fetch(fileUrl);
        if (!response.ok) {
            console.error("Excel dosyası indirilemedi:", response.status, response.statusText);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Excel dosyası indirilemedi: ${response.status} ${response.statusText}` }),
            };
        }

        // Excel verilerini okuma
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const keywordCollection = collection(db, "popular_keywords");

        let importedCount = 0;
        for (const row of data) {
            const keyword = row['Popular Keywords'];
            const link = row['Related Article Link'];

            if (keyword && link) {
                const docRef = doc(keywordCollection, keyword);
                await setDoc(docRef, {
                    keyword: keyword,
                    link: link
                });

                importedCount++;
                console.log(`✅ Firestore'a eklendi: ${keyword}`);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Toplam ${importedCount} anahtar kelime başarıyla Firestore'a aktarıldı!` }),
        };

    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Anahtar kelime ve linkleri aktarma sırasında bir hata oluştu." }),
        };
    }
};
