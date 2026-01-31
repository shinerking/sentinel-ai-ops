require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkConnection() {
    console.log("🔄 Sedang mengetes koneksi ke Google AI...");
    
    if (!process.env.GEMINI_API_KEY) {
        console.log("❌ API KEY TIDAK DITEMUKAN! Cek file .env kamu.");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Kita coba model "gemini-pro"
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    try {
        const result = await model.generateContent("Halo, apakah kamu aktif?");
        const response = await result.response;
        console.log("✅ SUKSES! AI Menjawab:", response.text());
        console.log("kesimpulan: API Key valid & Model 'gemini-pro' tersedia.");
    } catch (error) {
        console.log("❌ GAGAL KONEK. Detail Error:");
        console.log(error.message);
        console.log("------------------------------------------------");
        console.log("Saran: Coba buat API Key baru di aistudio.google.com");
    }
}

checkConnection();