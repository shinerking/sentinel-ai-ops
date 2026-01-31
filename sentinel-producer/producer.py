import socketio
import time
import os
import json

# --- KONFIGURASI AGENT ---
TARGET_FILE = "real-app.log"  # File yang akan dimata-matai
SERVER_URL = 'http://localhost:4000'
AGENT_NAME = "AGENT-01 (File Watcher)"

sio = socketio.Client()

@sio.event
def connect():
    print(f"✅ {AGENT_NAME} Connected to Sentinel Core")

@sio.event
def disconnect():
    print("❌ Disconnected from Server")

def parse_log_line(line):
    """
    Mengubah baris teks log mentah menjadi format JSON untuk Sentinel.
    Contoh Log Asli: "[2026-01-31 10:00:00] [CRITICAL] Database connection failed"
    """
    line = line.strip()
    if not line: return None

    # Default values (Intelligence Parsing)
    level = "INFO"
    service_name = "UNKNOWN-SERVICE"
    
    # Deteksi Level Sederhana
    if "CRITICAL" in line.upper(): level = "CRITICAL"
    elif "ERROR" in line.upper(): level = "ERROR"
    elif "WARNING" in line.upper(): level = "WARNING"
    
    # Deteksi Service (Bisa dipercanggih dengan Regex)
    if "payment" in line.lower(): service_name = "PAYMENT-GATEWAY"
    elif "auth" in line.lower() or "login" in line.lower(): service_name = "AUTH-SERVICE"
    elif "db" in line.lower() or "database" in line.lower(): service_name = "DB-CLUSTER-01"

    return {
        "service_name": service_name,
        "level": level,
        "message": line, # Kirim baris asli ke AI untuk dianalisis
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%S')
    }

def tail_file(filename):
    """
    Fungsi utama untuk memantau file secara real-time (seperti command 'tail -f')
    """
    # Tunggu sampai file ada
    while not os.path.exists(filename):
        print(f"⏳ Waiting for {filename} to be created...")
        time.sleep(1)

    print(f"👀 Watching file: {filename}")
    
    with open(filename, 'r') as f:
        # Pindah ke baris paling akhir (agar tidak membaca log lama)
        f.seek(0, os.SEEK_END)
        
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1) # Tunggu sebentar kalau tidak ada data baru
                continue
            
            # Jika ada baris baru, proses!
            log_payload = parse_log_line(line)
            if log_payload:
                print(f"📨 Sending: {log_payload['message']}")
                try:
                    sio.emit('ingest_log', log_payload)
                except Exception as e:
                    print(f"⚠️ Error sending: {e}")

def main():
    try:
        sio.connect(SERVER_URL)
        tail_file(TARGET_FILE)
    except KeyboardInterrupt:
        print("\n🛑 Agent Stopped")
        sio.disconnect()
    except Exception as e:
        print(f"🔥 Critical Error: {e}")

if __name__ == '__main__':
    main()