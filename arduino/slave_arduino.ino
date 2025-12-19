#include <SoftwareSerial.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// --- BLUETOOTH ---
SoftwareSerial BT(2, 3); // RX, TX

// --- HARDWARE ---
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo entryServo;
Servo exitServo;

// --- LCD TIMING FOR APP COMMANDS ---
unsigned long lcdTimer = 0; 
const unsigned long LCD_DELAY = 5000; 
bool showingCustomText = false;

// --- CONNECTION STATUS ---
bool btConnected = false;
bool masterConnected = false;
unsigned long lastMasterPing = 0;
unsigned long lastConnectionCheck = 0;
const unsigned long CONNECTION_CHECK_INTERVAL = 5000;  // Check every 5 seconds
const unsigned long MASTER_TIMEOUT = 10000;  // 10 seconds no response = disconnected

// --- PINS ---
const int entryTrig = 13;
const int entryEcho = 12;
const int entryServoPin = 10;
const int exitTrig = 0;
const int exitEcho = 0;
const int exitServoPin = 7;
const int debugLed = 6;

// --- TIMING SETTINGS ---
const int sensorCheckInterval = 100;
const int entryDistLimit = 20;
const unsigned long entryDetectTime = 2500;
const unsigned long entryCloseDelay = 2000;
const int exitDistLimit = 20;
const unsigned long exitDetectTime = 1500;
const unsigned long exitCloseDelay = 1500;
const int SPEED_SLOW = 40;
const int SPEED_FAST = 5;

// --- STATE VARIABLES ---
unsigned long entryFirstSeen = 0, entryLastSeen = 0;
bool entryIsOpen = false, entryObjPresent = false;
unsigned long exitFirstSeen = 0, exitLastSeen = 0;
bool exitIsOpen = false, exitObjPresent = false;
unsigned long lastCheck = 0;

void setup() {
  Serial.begin(9600);
  BT.begin(9600);
  
  Serial.println(F("\n[BOOT]"));
  
  pinMode(entryTrig, OUTPUT); pinMode(entryEcho, INPUT);
  pinMode(exitTrig, OUTPUT);  pinMode(exitEcho, INPUT);
  pinMode(debugLed, OUTPUT);
  
  lcd.init(); lcd.backlight(); lcd.clear();
  
  // Attach and test servos
  entryServo.attach(entryServoPin);
  exitServo.attach(exitServoPin);
  
  delay(100);
  
  // Check if servos are attached
  if (entryServo.attached()) {
    Serial.print(F("[OK] Entry servo on pin "));
    Serial.println(entryServoPin);
    entryServo.write(90);  // Start closed
  } else {
    Serial.println(F("[!] Entry servo FAILED"));
  }
  
  if (exitServo.attached()) {
    Serial.print(F("[OK] Exit servo on pin "));
    Serial.println(exitServoPin);
    exitServo.write(0);
  } else {
    Serial.println(F("[!] Exit servo FAILED"));
  }
  
  Serial.println(F("[OK] Hardware ready"));
  
  delay(1000);
  updateDefaultDisplay();
  sendToBT("SYSTEM:READY");
  Serial.println(F("[READY]\n"));
}

void loop() {
  unsigned long current = millis();
  
  // 1. GATE LOGIC
  if (current - lastCheck >= sensorCheckInterval) {
    lastCheck = current;
    handleEntryGate();
    handleExitGate();
  }

  // 2. LISTEN FOR APP COMMANDS (BT -> Master)
  if (BT.available()) {
    String msg = BT.readStringUntil('\n');
    msg.trim();
    
    if (msg.startsWith("LCD:")) {
      String customText = msg.substring(4); 
      lcd.clear();
      lcd.setCursor(0, 0); lcd.print("APP MESSAGE:");
      lcd.setCursor(0, 1); lcd.print(customText.substring(0, 16));
      lcdTimer = current;
      showingCustomText = true;
      Serial.println(F("[BT] LCD msg"));
      btConnected = true;  // BT is working if we receive data
    } 
    else if (msg == "PING") {
      sendToBT("PONG");
      btConnected = true;
      Serial.println(F("[BT] PONG"));
    }
    else {
      Serial.print(F("[BT] Fwd: "));
      Serial.println(msg); 
      btConnected = true;  // BT is working
    }
  }

  // 3. LISTEN FOR MASTER UPDATES (Master -> BT)
  if (Serial.available()) {
    String status = Serial.readStringUntil('\n');
    status.trim();
    
    if (status == "MASTER:PONG") {
      masterConnected = true;
      lastMasterPing = current;
      Serial.println(F("[MASTER] PONG"));
    }
    else if (status.length() > 0) {
      sendToBT(status);
      masterConnected = true;
      lastMasterPing = current;
    }
  }

  // 4. LCD TIMED RESTORE
  if (showingCustomText && (current - lcdTimer >= LCD_DELAY)) {
    showingCustomText = false;
    updateDefaultDisplay();
    Serial.println(F("[LCD] Restored"));
  }
  
  // 5. PERIODIC CONNECTION CHECK
  if (current - lastConnectionCheck >= CONNECTION_CHECK_INTERVAL) {
    lastConnectionCheck = current;
    checkConnections();
  }
}

void checkConnections() {
  unsigned long now = millis();
  
  if (masterConnected && (now - lastMasterPing > MASTER_TIMEOUT)) {
    masterConnected = false;
    Serial.println(F("[!] Master timeout"));
  }
  
  Serial.println("SLAVE:PING");
  
  // LED blink for status
  if (btConnected && masterConnected) {
    digitalWrite(debugLed, HIGH); delay(50);
    digitalWrite(debugLed, LOW);
  }
}

void updateDefaultDisplay() {
  displayLine(0, "System Ready");
  displayLine(1, "Entry & Exit");
}

void handleEntryGate() {
  long dist = readDist(entryTrig, entryEcho);
  unsigned long now = millis();
  bool detected = (dist > 0 && dist < entryDistLimit);
  
  if (detected) {
    if (!entryObjPresent) {
      entryFirstSeen = now; entryObjPresent = true;
      if (!showingCustomText) displayLine(0, "Entry: Detect");
      sendToBT("ENTRY:DETECTED");
    }
    entryLastSeen = now;
    
    unsigned long timeDetected = now - entryFirstSeen;
    if (!entryIsOpen && (timeDetected >= entryDetectTime)) {
      Serial.println(F("[ENTRY] Opening"));
      if (!showingCustomText) displayLine(0, "Entry: OPENING");
      moveServoSmooth(entryServo, 90, 0);  // Opening: 90 to 0
      entryIsOpen = true;
      sendToBT("ENTRY:OPEN");
      if (!showingCustomText) displayLine(0, "Entry: OPEN");
    }
  } else {
    if (entryObjPresent) { 
      entryObjPresent = false; 
      sendToBT("ENTRY:CLEAR"); 
    }
    
    if (entryIsOpen && (now - entryLastSeen >= entryCloseDelay)) {
      Serial.println(F("[ENTRY] Closing"));
      if (!showingCustomText) displayLine(0, "Entry: CLOSING");
      moveServoSmooth(entryServo, 0, 90);  // Closing: 0 to 90
      entryIsOpen = false;
      sendToBT("ENTRY:CLOSED");
      if (!showingCustomText) updateDefaultDisplay();
    }
  }
}

void handleExitGate() {
  long dist = readDist(exitTrig, exitEcho);
  unsigned long now = millis();
  bool detected = (dist > 0 && dist < exitDistLimit);
  
  if (detected) {
    if (!exitObjPresent) {
      exitFirstSeen = now; exitObjPresent = true;
      sendToBT("EXIT:DETECTED");
    }
    exitLastSeen = now;
    if (!exitIsOpen && (now - exitFirstSeen >= exitDetectTime)) {
      sendToBT("EXIT:OPENING");
      moveServoSmooth(exitServo, 0, 90);
      exitIsOpen = true;
      sendToBT("EXIT:OPEN");
    }
  } else {
    if (exitObjPresent) { exitObjPresent = false; sendToBT("EXIT:CLEAR"); }
    if (exitIsOpen && (now - exitLastSeen >= exitCloseDelay)) {
      sendToBT("EXIT:CLOSING");
      moveServoSmooth(exitServo, 90, 0);
      exitIsOpen = false;
      sendToBT("EXIT:CLOSED");
    }
  }
}

void moveServoSmooth(Servo &sv, int start, int end) {
  if (start < end) {
    for (int pos = start; pos <= end; pos++) {
      sv.write(pos); delay(getDelay(pos));
    }
  } else {
    for (int pos = start; pos >= end; pos--) {
      sv.write(pos); delay(getDelay(pos));
    }
  }
}

int getDelay(int pos) {
  float angleFactor = sin(pos * 3.14 / 90.0);
  return SPEED_SLOW - (angleFactor * (SPEED_SLOW - SPEED_FAST));
}

long readDist(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  
  long dur = pulseIn(echo, HIGH, 30000); 
  
  if (dur == 0) {
    return 999;
  }

  long distance = dur / 58.0;
  return distance;
}

void sendToBT(String msg) {
  BT.println(msg);
  digitalWrite(debugLed, HIGH); delay(20); digitalWrite(debugLed, LOW);
}

void displayLine(int row, String text) {
  String out = text;
  if (out.length() > 16) out = out.substring(0, 16);
  while (out.length() < 16) out += " ";
  lcd.setCursor(0, row); lcd.print(out);
}