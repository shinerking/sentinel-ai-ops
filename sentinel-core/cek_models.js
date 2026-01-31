require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// DAFTAR LENGKAP MODEL (Urut dari yang paling canggih)
const daftarModel = [
    // --- 🚀 GEMINI 3.0 (The Beast) ---
    "gemini-3.0-pro-exp",
    "gemini-3.0-pro-preview",
    "gemini-3.0-flash-exp",
    "gemini-3.0-flash-preview",
    
    // --- 🔥 GEMINI 2.5 (Stable & Powerful) ---
    "gemini-2.5-pro-latest",
    "gemini-2.5-pro",
    "gemini-2.5-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.5-flash-thinking", // Model yang bisa "mikir" dulu

    // --- ⚡ GEMINI 2.0 (Reliable) ---
    "gemini-2.0-pro-exp",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-thinking-exp",
    
    // --- 🛡️ LEGACY (Pasti Jalan) ---
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-pro"
];

async function cariModelYangValid() {
    console.log("\n===========================================");
    console.log("    🕵️  GEMINI MODEL DETECTIVE v3.0");
    console.log("===========================================\n");
    
    if (!process.env.GEMINI_API_KEY) {
        console.log("❌ FATAL: API KEY TIDAK DITEMUKAN! Cek file .env dulu.");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let modelDitemukan = false;

    for (const namaModel of daftarModel) {
        process.stdout.write(`👉 Testing: "${namaModel.padEnd(25)}" ... `);
        try {
            const model = genAI.getGenerativeModel({ model: namaModel });
            // Tes request super ringan
            await model.generateContent("Tes.");
            
            console.log("✅ AKTIF!");
            console.log(`\n🎉 KETEMU! Akun kamu support model canggih ini: "${namaModel}"`);
            
            // Langsung kasih instruksi
            console.log("\n⬇️  CARA PAKAI (Copy baris ini ke server.js):");
            console.log(`const NAMA_MODEL = "${namaModel}";`);
            
            modelDitemukan = true;
            break; // Stop kalau sudah ketemu yang paling bagus
        } catch (error) {
            if (error.message.includes("404") || error.message.includes("not found")) {
                console.log("❌ (404 Not Found)");
            } else if (error.message.includes("403")) {
                 console.log("⛔ (403 Restricted/Location)");
            } else {
                console.log(`⚠️ (Error Lain)`);
            }
        }
    }

    if (!modelDitemukan) {
        console.log("\n❌ SEMUA TEST GAGAL.");
        console.log("Saran: Coba pakai 'gemini-pro' saja atau bikin API Key baru.");
    }
}

cariModelYangValid();