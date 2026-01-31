"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- INTERFACES ---
interface LogData {
  timestamp?: string;
  created_at?: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  service_name?: string; 
  is_anomaly?: boolean;
  analysis?: string;
  risk_score?: number;
  attack_type?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export default function Home() {
  // --- STATE DASHBOARD ---
  const [logs, setLogs] = useState<LogData[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedService, setSelectedService] = useState('ALL');
  const router = useRouter();

  // --- STATE CHATBOT (BARU) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Halo Commander! Sentinel AI siap menganalisis keamanan server Anda. Ada yang bisa saya bantu?' }
  ]);
  const [question, setQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- LOGIC CHATBOT ---
  const handleAskAI = async (e: any) => {
    e.preventDefault();
    if (!question.trim()) return;

    // 1. Masukkan pertanyaan user ke chat
    const userMsg = question;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuestion('');
    setIsChatLoading(true);

    try {
      // 2. Kirim ke Backend RAG
      const res = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      });
      
      const data = await res.json();
      
      // 3. Masukkan jawaban AI ke chat
      setChatHistory(prev => [...prev, { role: 'ai', text: data.answer || "Maaf, terjadi kesalahan koneksi." }]);

    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "⚠️ Error: Gagal menghubungi server Sentinel." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Auto scroll ke bawah chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatOpen]);


  // --- LOGIC DASHBOARD LAMA ---
  const filteredLogs = useMemo(() => {
    if (selectedService === 'ALL') return logs;
    return logs.filter(log => log.service_name === selectedService);
  }, [logs, selectedService]);

  const serviceHealth = useMemo(() => {
    const services = ["AUTH-SERVICE", "PAYMENT-GATEWAY", "DB-CLUSTER-01"];
    const status: any = {};
    services.forEach(svc => {
      const svcLogs = logs.filter(l => l.service_name === svc);
      const recentCritical = svcLogs.slice(0, 5).some(l => l.level === 'CRITICAL');
      const recentError = svcLogs.slice(0, 5).some(l => l.level === 'ERROR');
      if (recentCritical) status[svc] = "CRITICAL";
      else if (recentError) status[svc] = "DEGRADED";
      else status[svc] = "HEALTHY";
    });
    return status;
  }, [logs]);

  const chartData = useMemo(() => {
    return [...logs].slice(0, 20).reverse().map(log => ({
      time: log.timestamp || log.created_at || '',
      risk: log.risk_score || 0,
      level: log.level
    }));
  }, [logs]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); 
    router.refresh();
  };

  const stats = useMemo(() => {
    const totalLogs = logs.length;
    const anomalies = logs.filter(l => l.is_anomaly).length;
    const criticals = logs.filter(l => l.level === 'CRITICAL').length;
    const riskLogs = logs.filter(l => (l.risk_score || 0) > 0);
    const avgRisk = riskLogs.length > 0 
      ? (riskLogs.reduce((acc, curr) => acc + (curr.risk_score || 0), 0) / riskLogs.length).toFixed(0)
      : 0;
    return { totalLogs, anomalies, criticals, avgRisk };
  }, [logs]);

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('init_history', (historyData: LogData[]) => setLogs(historyData));
    newSocket.on('new_log', (data: LogData) => setLogs((prev) => [data, ...prev].slice(0, 200)));
    return () => { newSocket.disconnect(); };
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen text-slate-200 font-sans pb-20 selection:bg-indigo-500 selection:text-white relative">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">SENTINEL <span className="text-indigo-500">OPS</span></h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Microservices Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-red-900/30 text-red-400 border-red-500/30'}`}>
                {isConnected ? '● CONNECTED' : '● DISCONNECTED'}
             </div>
             <button onClick={handleLogout} className="text-xs font-bold text-red-400 hover:text-white transition-colors">LOGOUT</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* SERVICE HEALTH GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <ServiceCard name="AUTH-SERVICE" status={serviceHealth["AUTH-SERVICE"] || "HEALTHY"} icon="🔐" />
           <ServiceCard name="PAYMENT-GATEWAY" status={serviceHealth["PAYMENT-GATEWAY"] || "HEALTHY"} icon="💳" />
           <ServiceCard name="DB-CLUSTER-01" status={serviceHealth["DB-CLUSTER-01"] || "HEALTHY"} icon="🗄️" />
        </div>

        {/* STATS & CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="space-y-4">
              <StatCard title="TOTAL EVENTS" value={stats.totalLogs} color="text-slate-200" />
              <StatCard title="ACTIVE THREATS" value={stats.anomalies} color="text-red-500" highlight />
              <StatCard title="AVG RISK SCORE" value={`${stats.avgRisk}%`} color="text-indigo-400" />
           </div>
           
           <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Global Threat Intensity</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Area type="monotone" dataKey="risk" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" animationDuration={300} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* LOG FEED */}
        <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden shadow-2xl min-h-[500px]">
          <div className="border-b border-white/5 bg-white/[0.02] flex items-center px-2">
             {['ALL', 'AUTH-SERVICE', 'PAYMENT-GATEWAY', 'DB-CLUSTER-01'].map(svc => (
                <button 
                  key={svc}
                  onClick={() => setSelectedService(svc)}
                  className={`px-6 py-4 text-xs font-bold transition-all border-b-2 ${
                    selectedService === svc 
                    ? 'border-indigo-500 text-white bg-white/5' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {svc}
                </button>
             ))}
          </div>

          <div className="divide-y divide-white/5">
            {filteredLogs.length === 0 && (
              <div className="p-12 text-center text-slate-600">No logs found for this service.</div>
            )}

            {filteredLogs.map((log, index) => {
              const rawTime = log.timestamp || log.created_at || new Date().toISOString();
              const timeDisplay = rawTime.includes('T') ? rawTime.split('T')[1].split('.')[0] : rawTime;
              return (
                <div key={index} className={`group p-4 flex gap-4 transition-all hover:bg-white/[0.02] ${log.is_anomaly ? 'bg-red-900/5' : ''}`}>
                  <div className="flex flex-col gap-2 w-32 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">{timeDisplay}</span>
                    <div className="flex flex-col gap-1">
                      <Badge level={log.level} />
                      <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 w-fit">
                          {log.service_name || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-medium ${log.is_anomaly ? 'text-red-200' : 'text-slate-300'}`}>{log.message}</p>
                      {log.is_anomaly && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 uppercase tracking-wide animate-pulse">THREAT DETECTED</span>}
                    </div>
                    {log.is_anomaly && (
                      <div className="mt-2 bg-red-950/20 p-3 rounded border-l-2 border-red-500 flex gap-3">
                        <div className="text-xl">🛡️</div>
                        <div className="space-y-1 w-full">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-red-400">AI ANALYSIS: {log.attack_type}</p>
                            <span className="text-xs font-mono text-red-500">{log.risk_score}% RISK</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{log.analysis}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* --- FLOATING CHATBOT WIDGET (FINAL BOSS) --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        
        {/* Chat Window */}
        {isChatOpen && (
          <div className="w-[350px] h-[500px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-indigo-600 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-bold text-white">Sentinel AI</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-black/50">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-[#222] text-slate-200 border border-white/5 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#222] p-3 rounded-2xl rounded-bl-none border border-white/5">
                    <span className="animate-pulse text-xs text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}></div>
            </div>

            {/* Input */}
            <form onSubmit={handleAskAI} className="p-3 bg-[#111] border-t border-white/5">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about security threats..." 
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" disabled={isChatLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors">
                  🚀
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Floating Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          {isChatOpen ? (
            <span className="text-2xl">✕</span>
          ) : (
            <span className="text-2xl">💬</span>
          )}
        </button>
      </div>

    </div>
  );
}

// --- COMPONENTS ---
function ServiceCard({ name, status, icon }: any) {
   const colors: any = {
      HEALTHY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      DEGRADED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
   };
   return (
      <div className={`p-4 rounded-xl border flex items-center justify-between ${colors[status] || colors.HEALTHY}`}>
         <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
               <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-70">{name}</h3>
               <p className="text-sm font-bold">{status}</p>
            </div>
         </div>
         <div className={`w-2 h-2 rounded-full ${status === 'HEALTHY' ? 'bg-emerald-500' : status === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      </div>
   );
}

function StatCard({ title, value, color, highlight }: any) {
  return (
    <div className={`p-4 rounded-xl border bg-[#111] flex justify-between items-center ${highlight ? 'border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-white/5'}`}>
      <div>
         <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{title}</h3>
         <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function Badge({ level }: { level: string }) {
  const styles: any = {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
    ERROR: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    WARNING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    INFO: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border w-fit ${styles[level] || styles.INFO}`}>{level}</span>;
}