import serial
import asyncio

class SerialComm: 

    def __init__(self, port, baudrate, debug=False): 
        self.port = serial.Serial(port, baudrate=baudrate, timeout=1.0)
        self.debug = debug

    async def serial_write(self, msg): 
        await asyncio.to_thread(self._serial_write, msg)

    def _serial_write(self, msg): 
        try: 
            self.port.write(msg.encode())
            print(f"Sent message: {msg}")
        except Exception as e: 
            print(f"Error sending data: {e}")

    async def serial_delay(self, delay): 
        await asyncio.sleep(delay)

    def read_data(self): 
        if self.port.in_waiting > 0: 
            try:
                line = self.port.readline().decode().strip()
                if self.debug:
                    print(f"[Rx]: {line}")
                return line 
            except Exception as e:
                print(f"Error decoding data: {e}")
                return None

    def close(self): 
        self.port.close()

    def __enter__(self): 
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        self.close()