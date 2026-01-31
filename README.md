# 🛡️ Sentinel Enterprise: Real-Time AI Security Monitoring

Sentinel adalah platform monitoring keamanan berbasis Microservices yang menggunakan AI untuk mendeteksi ancaman pada log aplikasi secara instan.

## 🚀 Fitur Utama
- **AI Threat Analysis**: Menganalisis log menggunakan Google Gemini 2.5 Pro untuk menentukan skor risiko secara otomatis.
- **Real-Time Dashboard**: Visualisasi data live menggunakan WebSocket (Socket.io).
- **Enterprise Architecture**: Menggunakan Docker Compose untuk orkestrasi Backend, Frontend, dan Redis.
- **RAG Chatbot**: Konsultasi keamanan langsung dengan AI yang memahami riwayat log kamu.

## 🛠️ Teknologi yang Digunakan
- **Frontend**: Next.js 15, Tailwind CSS, Lucide React.
- **Backend**: Node.js (Express), Socket.io.
- **Database & Cache**: Supabase (Vector DB), Redis.
- **DevOps**: Docker, Docker Compose.

## ⚡ Cara Menjalankan
1. Clone repositori ini.
2. Buat file `.env` (Gunakan `.env.example` sebagai panduan).
3. Jalankan perintah Docker:
   ```bash
   docker-compose up --build