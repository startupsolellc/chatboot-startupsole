Güncellenmiş README.md Dosyası:
# Chatboot - Startupsole

## 📄 Proje Tanımı

Chatboot, **Startupsole.com** için geliştirilmiş, **OpenAI** destekli, sağ alt köşede yer alan bir **sohbet widget'ıdır**. Kullanıcıların web sitesinde hızlıca sorular sormasına ve **OpenAI GPT-4o-mini** modeli ile **akıllı yanıtlar** almasına olanak tanır. Proje, hem masaüstü hem de mobil cihazlarda **kullanıcı dostu bir deneyim** sunar.

---

## 🚀 Kullanılan Teknolojiler

- **React:** Ana frontend kütüphanesi.
- **Netlify:** Uygulamanın barındırılması ve **serverless functions** (OpenAI entegrasyonu) için.
- **OpenAI API:** **GPT-4o-mini** modeli kullanılarak akıllı cevaplar üretiliyor.
- **Styled Components:** Widget tasarımı ve stil yönetimi.
- **Firebase Firestore:** Dinamik veri (SSS ve Blog içerikleri) entegrasyonu.
- **Git & GitHub:** Sürüm kontrolü ve kod yönetimi.

---

## 🏛️ Proje Mimarisi

- **Frontend:** **React** ile inşa edilmiş ve **Netlify** üzerinden statik olarak sunuluyor.
- **Backend:** **Netlify Functions** kullanılarak **OpenAI API**'ye güvenli bağlantı sağlanıyor.
- **Widget Yapısı:** Uygulama, **Netlify** üzerinde **embed edilebilir bir widget** olarak yapılandırılmıştır ve **WordPress**'e kolayca entegre edilebiliyor.
- **Veri Kaynağı:** **Firebase Firestore** üzerinden **SSS** ve **Blog içerikleri** dinamik olarak çekiliyor.

---

## 💻 Kurulum ve Çalıştırma

### 📂 **Geliştirme Ortamında:**

```bash
# Projeyi klonla
git clone https://github.com/startupsolellc/chatboot-startupsole.git

# Proje klasörüne gir
cd chatboot-startupsole

# Bağımlılıkları yükle
npm install

# Uygulamayı çalıştır
npm start
________________________________________
🌐 Netlify Üzerinde Yayına Alma:
Değişiklikleri GitHub'a gönderin:
bash
CopyEdit
git add .
git commit -m "Güncelleme yapıldı"
git push
•	Netlify otomatik olarak build ve deploy işlemini başlatır.
•	Netlify Functions ve CSP ayarları güncel olmalıdır.
________________________________________
🌍 WordPress Entegrasyonu:
Chatboot widget'ını WordPress'e entegre etmek için aşağıdaki embed kodunu kullanabilirsiniz:
html
CopyEdit
<div id="chatboot-widget-container"></div>
<script
    src="https://startupsolechatboot.netlify.app/widget.js"
    data-src="https://startupsolechatboot.netlify.app"
    async>
</script>
•	WordPress yönetim panelinde: Görünüm > Bileşenler > HTML Bileşeni ekleyerek bu kodu yapıştırın.
________________________________________
📂 Klasör Yapısı ve Dosya Açıklamaları:
plaintext
CopyEdit
chatboot-startupsole/
├── public/                 # Statik dosyalar
│   ├── index.html          # Uygulama başlangıç sayfası
│   └── widget.js           # WordPress entegrasyon scripti
├── src/                    # React bileşenleri
│   ├── components/
│   │   └── ChatWidget.js   # Sohbet widget bileşeni
│   ├── App.js              # Ana uygulama
│   └── index.js            # React uygulamasını başlatır
├── netlify/functions/      # OpenAI API proxy fonksiyonu
│   ├── openaiProxy.js
│   └── openaiFirebaseProxy.js
└── package.json            # Proje bağımlılıkları
________________________________________
🎨 Tasarım ve Stil:
•	Font: Plus Jakarta Sans
•	Metin Stili:
css
CopyEdit
font-style: normal;
font-weight: 500;
letter-spacing: -0.28px;
line-height: 25px;
font-size: 14px;
color: #111213;
•	Renkler:
css
CopyEdit
Birincil Renk: #0066cc
İkincil Renk: #ffcc00
Metin Rengi: #111213
Arka Plan Rengi: #f4f4f4
________________________________________
🧠 Eğitim ve Chatbot'u Özelleştirme:
•	OpenAI API Anahtarı: Netlify Environment Variables içinde REACT_APP_OPENAI_API_KEY olarak tanımlı.
•	Eğitim Süreci: Uygulama OpenAI GPT-4o-mini modelini kullanıyor.
•	Veri Kaynağı: Firebase Firestore'dan SSS ve Blog içerikleri otomatik olarak çekiliyor.
________________________________________
🔄 Güncellenen Content Security Policy (CSP) Ayarları:
📄 netlify.toml dosyasında CSP tamamen esnek hale getirildi:
toml
CopyEdit
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; frame-src *;"
________________________________________
👥 Katkıda Bulunmak:
1.	Fork yapın.
2.	Yeni özellik ekleyin veya hataları düzeltin.
3.	Pull request gönderin!
________________________________________
📧 İletişim:
Herhangi bir sorun veya öneriniz varsa lütfen bizimle iletişime geçin:
•	E-posta: support@startupsole.com

