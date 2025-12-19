# Arduino Files

This folder contains Arduino sketches and related files for the ArduinoControlApp project.

## Architecture

This project uses a **Master-Slave** architecture:

### Master Arduino (`master_arduino.ino`)
- Acts as the central controller
- Communicates with the Android/React Native app via Bluetooth/Serial
- Manages up to 4 slave Arduino units via I2C
- Aggregates parking data from all slaves
- Provides system-wide status and control

### Slave Arduino (`slave_arduino.ino`)
- Monitors individual parking spots
- Uses ultrasonic or IR sensors to detect vehicles
- Reports occupancy status to the master via I2C
- Each slave handles one parking spot
- Addressable via I2C (addresses 8-11)

### Single Unit (`parking_controller.ino`)
- Example standalone controller (no master-slave setup)
- Use if you only need one Arduino

## Setup Instructions

### Master Arduino Setup
1. Open `master_arduino.ino` in Arduino IDE
2. Connect Bluetooth module to Serial pins (TX/RX)
3. Connect I2C lines (SDA/SCL) to all slave units
4. Upload to Arduino Uno/Nano
5. I2C Address: Master (no address needed)

### Slave Arduino Setup
1. Open `slave_arduino.ino` in Arduino IDE
2. **IMPORTANT**: Change `SLAVE_ID` to 1, 2, 3, or 4 for each unit
3. Connect your sensor:
   - **Ultrasonic**: TRIG→Pin 3, ECHO→Pin 2
   - **IR Sensor**: OUT→Pin 2
4. Upload to Arduino Uno/Nano
5. I2C Addresses: Slave 1=8, Slave 2=9, Slave 3=10, Slave 4=11

### Wiring Diagram
```
Master Arduino          Slave Arduino 1-4
--------------          -----------------
SDA (A4) ←─────────────→ SDA (A4)
SCL (A5) ←─────────────→ SCL (A5)
GND ←──────────────────→ GND

Master Arduino
--------------
TX/RX ←────────────────→ Bluetooth Module
```

## Communication Protocol

### Master to App (Serial/Bluetooth)
```json
{"spot":1,"occupied":true,"timestamp":12345}
{"total":4,"occupied":2,"available":2,"disconnected":0}
```

### App to Master Commands
- `STATUS` - Get current system status
- `DETAILS` - Get detailed info for all spots
- `RESET` - Reset system
- `PING:1` - Ping specific slave (1-4)

### Master to Slave (I2C)
- Master requests 1 byte: `0` = empty, `1` = occupied

## Hardware Requirements

### Master Arduino
- Arduino Uno/Nano
- Bluetooth module (HC-05/HC-06) or ESP32 for WiFi
- LEDs for status indication

### Each Slave Arduino
- Arduino Uno/Nano
- Ultrasonic sensor (HC-SR04) OR IR obstacle sensor
- LEDs for status indication
- Pull-up resistors for I2C (4.7kΩ) if needed
