import socket
import threading

# Config
HOST = '0.0.0.0'       # Listen on all interfaces
PORT = 9999            # Arbitrary non-privileged port
NUM_CLIENTS = 3        # Set this to the number of Raspberry Pis expected

clients = []
lock = threading.Lock()

def handle_client(conn, addr):
    print(f"[+] Connected by {addr}")
    with lock:
        clients.append(conn)

    # Wait for the start signal (server side controls this)
    # Keep the thread alive
    while True:
        try:
            data = conn.recv(1024)
            if not data:
                break  # client disconnected
        except:
            break

    print(f"[-] Disconnected {addr}")
    with lock:
        clients.remove(conn)
    conn.close()

def wait_for_clients():
    print(f"[*] Waiting for {NUM_CLIENTS} clients to connect...")
    while True:
        with lock:
            if len(clients) >= NUM_CLIENTS:
                break
    print("[*] All clients connected. Sending start signal...")

    for client in clients:
        try:
            client.sendall(b'start')
        except Exception as e:
            print(f"[!] Failed to send start signal: {e}")

def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen()
    print(f"[+] Server listening on {HOST}:{PORT}")

    threading.Thread(target=wait_for_clients).start()

    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    start_server()
