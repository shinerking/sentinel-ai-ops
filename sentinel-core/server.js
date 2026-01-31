require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const PORT = process.env.PORT || 4000;
const AI_MODEL_NAME = "gemini-2.5-pro"; 
const EMBEDDING_MODEL_NAME = "text-embedding-004"; 

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: AI_MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
});

const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });

// --- CACHING SYSTEM ---
const aiCache = new Map();
function checkCache(key) { return aiCache.get(key) || null; }
function saveToCache(key, result) {
    aiCache.set(key, result);
    if (aiCache.size > 1000) aiCache.delete(aiCache.keys().next().value);
}

// --- HELPER: GENERATE EMBEDDING ---
async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error.message);
        return null;
    }
}

// --- DISCORD ALERT ---
async function sendDiscordAlert(log) {
    if (!process.env.DISCORD_WEBHOOK_URL) return;
    if (log.risk_score < 75 && log.level !== 'CRITICAL') return;
    
    const payload = {
        username: "Sentinel AI",
        embeds: [{
            title: `🚨 THREAT: ${log.service_name}`,
            description: log.analysis,
            color: 15548997,
            fields: [
                { name: "Risk", value: `${log.risk_score}%`, inline: true },
                { name: "Type", value: log.attack_type, inline: true }
            ]
        }]
    };
    try { await fetch(process.env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {}
}

// --- AI SERVICE (LOG ANALYSIS) ---
async function askGemini(logData) {
    const cacheKey = `${logData.service_name}:${logData.message}`.trim().toLowerCase();
    const cached = checkCache(cacheKey);
    if (cached) {
        console.log(`⚡ CACHE HIT: ${cacheKey.substring(0, 20)}...`);
        return cached;
    }

    try {
        const prompt = `
        Role: Cybersecurity Expert. Context: Service "${logData.service_name}". Log: "${logData.message}".
        Task: Analyze for anomalies. Output JSON: { "is_anomaly": boolean, "risk_score": number, "attack_type": string, "analysis": string }`;
        
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());
        saveToCache(cacheKey, parsed);
        return parsed;
    } catch (error) {
        return { is_anomaly: false, risk_score: 0, attack_type: "Unknown", analysis: "AI Fallback" };
    }
}

// --- NEW ENDPOINT: CHAT WITH DATA (RAG) ---
app.post('/api/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "No question provided" });

    console.log(`💬 Chat Question: ${question}`);

    try {
        // 1. Generate Embedding Pertanyaan User
        const queryEmbedding = await generateEmbedding(question);
        if (!queryEmbedding) throw new Error("Gagal generate embedding");

        // 2. Cari Log di Database (Semantic Search)
        // 🔥 UPDATE 1: Threshold kita turunkan drastis ke 0.15
        // Supaya dia bisa menangkap konteks yang "samar-samar" atau beda bahasa
        const { data: matchedLogs, error } = await supabase.rpc('match_logs', {
            query_embedding: queryEmbedding,
            match_threshold: 0.15, // Toleransi tinggi untuk bahasa non-baku/campur
            match_count: 5
        });

        if (error) throw error;

        // Jika tidak ada log, jangan langsung nyerah. Kirim info kosong biar AI tetap menjawab ramah.
        const context = matchedLogs && matchedLogs.length > 0 
            ? matchedLogs.map(log => `[${log.created_at}] Service: ${log.service_name} | Msg: ${log.message} | Analysis: ${log.analysis}`).join('\n')
            : "No specific logs found related to this query in recent history.";

        // 3. Tanya Gemini (Chat Mode)
        const chatModel = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
        
        // 🔥 UPDATE 2: System Prompt "Bilingual & Empathy"
        const prompt = `
        Role: Sentinel AI (Cybersecurity Assistant).
        Personality: Professional, helpful, concise, and smart.
        
        Capabilities:
        1. You understand both Indonesian (Bahasa) and English perfectly.
        2. Even if the user uses slang, informal language, or vague terms (e.g., "kok error?", "kenapa mati?", "what happened?"), you must infer their intent.
        
        User Question: "${question}"
        
        Database Logs Context (Fact Source):
        ${context}
        
        Instructions:
        - Analyze the "Database Logs Context" to answer the user's question.
        - If the user asks in Indonesian, ANSWER IN INDONESIAN.
        - If the user asks in English, ANSWER IN ENGLISH.
        - If no logs are found, politely say that everything looks safe based on recent data.
        - Explain technical terms simply if the user seems confused.
        `;

        const result = await chatModel.generateContent(prompt);
        const answer = result.response.text();

        res.json({ answer });

    } catch (err) {
        console.error("Chat Error:", err.message);
        res.status(500).json({ error: "Failed to process chat" });
    }
});

// --- MAIN SOCKET LOGIC ---
io.on('connection', async (socket) => {
    console.log(`🔌 Client: ${socket.id}`);

    const { data: history } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (history) socket.emit('init_history', history);

    socket.on('ingest_log', async (rawLog) => {
        rawLog.service_name = rawLog.service_name || 'unknown';
        const aiVerdict = await askGemini(rawLog);

        const processedLog = { ...rawLog, ...aiVerdict };

        if (processedLog.is_anomaly) {
            console.log(`🚨 [${processedLog.service_name}] RISK ${processedLog.risk_score}%`);
            sendDiscordAlert(processedLog);
        } else {
            console.log(`✅ [${processedLog.service_name}] CLEAN`);
        }

        io.emit('new_log', processedLog);
        
        (async () => {
            // Kita embed deskripsi analisisnya juga supaya pencarian makin kaya konteks
            const contentToEmbed = `Service: ${processedLog.service_name}. Message: ${processedLog.message}. Analysis: ${processedLog.analysis}. Type: ${processedLog.attack_type}`;
            const embeddingVector = await generateEmbedding(contentToEmbed);

            await supabase.from('logs').insert({
                level: processedLog.level,
                message: processedLog.message,
                is_anomaly: processedLog.is_anomaly,
                analysis: processedLog.analysis,
                service_name: processedLog.service_name,
                risk_score: processedLog.risk_score,
                attack_type: processedLog.attack_type,
                created_at: new Date().toISOString(),
                embedding: embeddingVector
            });
        })();
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 SENTINEL CORE (MULTILINGUAL CHAT) ONLINE`);
    console.log(`🧠 AI Model: ${AI_MODEL_NAME}`);
});