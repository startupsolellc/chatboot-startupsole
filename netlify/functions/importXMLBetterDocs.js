// netlify/functions/importXMLBetterDocs.js

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const xml2js = require('xml2js');

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
        const xmlUrl = 'https://startupsole.com/wp-content/uploads/2025/02/betterdocs.xml';
        console.log(`🌐 XML Dosyası URL: ${xmlUrl}`);

        const response = await fetch(xmlUrl);
        if (!response.ok) {
            console.error("XML dosyası indirilemedi:", response.status, response.statusText);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `XML dosyası indirilemedi: ${response.status} ${response.statusText}` }),
            };
        }

        const xmlData = await response.text();
        const parser = new xml2js.Parser();

        const result = await parser.parseStringPromise(xmlData);
        console.log('📦 XML Veri Başarıyla Çözümlendi. Örnek Veri:', JSON.stringify(result, null, 2));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "XML dosyası başarıyla indirildi ve çözümlendi!" }),
        };

    } catch (error) {
        console.error("❌ Hata Detayı:", error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "XML indirme veya çözümleme sırasında bir hata oluştu." }),
        };
    }
};
