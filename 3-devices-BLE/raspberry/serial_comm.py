import asyncio
import serial 


class SerialComm: 
    def __init__(self, port, baudrate): 
        self.port = serial.Serial(port, baudrate=baudrate, timeout=1.0)

    async def serial_write(self, msg): 
        try: 
            self.port.write(msg.encode())
            print(f"Sent message: {msg}")
        except Exception as e: 
            print(f"Error sending data: {e}")

    async def serial_delay(self, delay): 
        await asyncio.sleep(delay)

    def read_data(self): 
        if self.port.in_waiting > 0: 
            return self.port.readline().decode().strip()
        return None 
    
    def close(self): 
        self.port.close()