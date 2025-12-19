#include <RBD_LightSensor.h>

// --- SIMPLE STRUCTURE ---
struct ParkingSlot {
  int id;
  int redPin;
  int greenPin;
  bool enabled;
  float threshold;  // Occupancy threshold (set manually below)
  RBD::LightSensor* sensor;
};

// --- SENSOR OBJECTS ---
RBD::LightSensor s1(A0); RBD::LightSensor s2(A1); 
RBD::LightSensor s3(A2); RBD::LightSensor s4(A3); 
RBD::LightSensor s5(A4);

// ========================================
// SET YOUR THRESHOLDS HERE (occupied when reading <= threshold)
// ========================================
ParkingSlot slots[] = {
  {1, 12, 13, true, 2.0, &s1},   // P1: occupied when <= 1
  {2, 10, 11, true, 3, &s2},  // P2: occupied when <= 70
  {3, 8,  9,  true, 3.0, &s3},  // P3: occupied when <= 70
  {4, 6,  7,  true, 4.0, &s4},  // P4: occupied when <= 70
  {5, 5,  4,  true, 3.0, &s5}   // P5: occupied when <= 70
};
const int NUM_SLOTS = sizeof(slots) / sizeof(slots[0]);

// --- SETTINGS ---
bool sentState[6];
unsigned long changeTimer[6];
const unsigned long STABILITY_DELAY = 1000;

void setup() {
  Serial.begin(9600);

  for(int i = 0; i < NUM_SLOTS; i++) {
    pinMode(slots[i].redPin, OUTPUT); 
    pinMode(slots[i].greenPin, OUTPUT);
    digitalWrite(slots[i].redPin, LOW);
    digitalWrite(slots[i].greenPin, HIGH);  // Start with GREEN
    sentState[slots[i].id] = false;
    changeTimer[slots[i].id] = 0;
    
    Serial.print("SLOT:P"); 
    Serial.print(slots[i].id); 
    Serial.println(":VACANT");
  }
  
  Serial.println("====================================");
  Serial.println("Simple Threshold Mode");
  Serial.println("Edit thresholds in code (lines 21-26)");
  Serial.println("====================================");
  Serial.println("SYSTEM:READY");
}

void loop() {
  // Listen for commands
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    // Respond to Slave's ping for connection monitoring
    if (cmd == "SLAVE:PING") {
      Serial.println("MASTER:PONG");
    } else {
      handleIncomingCommand(cmd);
    }
  }

  // Check all slots
  for (int i = 0; i < NUM_SLOTS; i++) {
    if (slots[i].enabled) {
      checkParking(slots[i]);
    }
  }
  delay(100); 
 
  // Debug output for all slots
  Serial.print("P1: "); Serial.print(s1.getPercentValue()); 
  Serial.print(" ["); Serial.print(slots[0].threshold, 1); Serial.print("] ");
  Serial.print(sentState[1] ? "OCC" : "VAC");
  Serial.print(" | P2: "); Serial.print(s2.getPercentValue()); 
  Serial.print(" ["); Serial.print(slots[1].threshold, 1); Serial.print("] ");
  Serial.print(sentState[2] ? "OCC" : "VAC");
  Serial.print(" | P3: "); Serial.print(s3.getPercentValue()); 
  Serial.print(" ["); Serial.print(slots[2].threshold, 1); Serial.print("] ");
  Serial.print(sentState[3] ? "OCC" : "VAC");
  Serial.print(" | P4: "); Serial.print(s4.getPercentValue()); 
  Serial.print(" ["); Serial.print(slots[3].threshold, 1); Serial.print("] ");
  Serial.print(sentState[4] ? "OCC" : "VAC");
  Serial.print(" | P5: "); Serial.print(s5.getPercentValue()); 
  Serial.print(" ["); Serial.print(slots[4].threshold, 1); Serial.print("] ");
  Serial.println(sentState[5] ? "OCC" : "VAC");
}

void handleIncomingCommand(String cmd) {
  int separator = cmd.indexOf(':');
  if (separator == -1) return;

  String action = cmd.substring(0, separator);
  String slotPart = cmd.substring(separator + 1);
  int targetId = slotPart.substring(1).toInt();

  for (int i = 0; i < NUM_SLOTS; i++) {
    if (slots[i].id == targetId) {
      if (action == "DISABLE") {
        slots[i].enabled = false;
        digitalWrite(slots[i].redPin, HIGH);
        digitalWrite(slots[i].greenPin, LOW);
      } 
      else if (action == "ENABLE") {
        slots[i].enabled = true;
      } 
      else if (action == "PING") {
        flashLEDs(slots[i]);
      } 
      else if (action == "READ") {
        Serial.print("DATA:P"); Serial.print(slots[i].id);
        Serial.print(":VAL:"); Serial.println(slots[i].sensor->getPercentValue());
      }
      break;
    }
  }
}

void checkParking(ParkingSlot &s) {
  float currentVal = s.sensor->getPercentValue();
  
  // Simple threshold check
  bool isPhysicallyOccupied = (currentVal <= s.threshold);

  // Debounce state changes
  if (isPhysicallyOccupied != sentState[s.id]) {
    if (changeTimer[s.id] == 0) changeTimer[s.id] = millis();

    if (millis() - changeTimer[s.id] > STABILITY_DELAY) {
      sentState[s.id] = isPhysicallyOccupied;
      
      if (sentState[s.id]) {
        digitalWrite(s.redPin, HIGH); 
        digitalWrite(s.greenPin, LOW);
        Serial.print("SLOT:P"); Serial.print(s.id); Serial.println(":OCCUPIED");
      } else {
        digitalWrite(s.redPin, LOW); 
        digitalWrite(s.greenPin, HIGH);
        Serial.print("SLOT:P"); Serial.print(s.id); Serial.println(":VACANT");
      }
      changeTimer[s.id] = 0;
    }
  } else {
    changeTimer[s.id] = 0;
  }
}

void flashLEDs(ParkingSlot &s) {
  for(int i = 0; i < 5; i++) {
    digitalWrite(s.redPin, HIGH); digitalWrite(s.greenPin, HIGH);
    delay(200);
    digitalWrite(s.redPin, LOW); digitalWrite(s.greenPin, LOW);
    delay(200);
  }
  // Restore state
  if (!s.enabled) {
    digitalWrite(s.redPin, HIGH); digitalWrite(s.greenPin, LOW);
  } else {
    digitalWrite(s.redPin, sentState[s.id] ? HIGH : LOW);
    digitalWrite(s.greenPin, sentState[s.id] ? LOW : HIGH);
  }
}