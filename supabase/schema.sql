-- ParkSense IoT Parking Monitoring - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PARKING SLOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parking_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- e.g., "P1", "P2", "Lot A1"
  allowed_minutes INTEGER DEFAULT 180, -- 3 hours default before overtime
  is_disabled BOOLEAN DEFAULT false,
  is_placeholder BOOLEAN DEFAULT false, -- For "ADD PARK" slots
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SLOT STATUS TABLE (Real-time updates)
-- ============================================
CREATE TABLE IF NOT EXISTS slot_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE CASCADE UNIQUE,
  status VARCHAR(20) DEFAULT 'vacant', -- 'occupied', 'overtime', 'vacant', 'disabled'
  occupied_since TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SENSOR READINGS TABLE (Photoresistor data)
-- ============================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE CASCADE,
  photoresistor_value INTEGER NOT NULL, -- 0-1023 analog value
  is_occupied BOOLEAN NOT NULL, -- Derived from threshold
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEVICE STATUS TABLE (Bluetooth/HC-05 status)
-- ============================================
CREATE TABLE IF NOT EXISTS device_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'HC-05-MAIN',
  rssi INTEGER, -- Signal strength in dBm
  is_connected BOOLEAN DEFAULT false,
  last_ping TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEVICE COMMANDS TABLE (Command dispatch)
-- ============================================
CREATE TABLE IF NOT EXISTS device_commands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE CASCADE,
  command_type VARCHAR(50) NOT NULL, -- 'PING_LED_5X', 'DISABLE_SLOT', 'ENABLE_SLOT'
  payload JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'executed', 'failed'
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PARKING SESSIONS TABLE (History)
-- ============================================
CREATE TABLE IF NOT EXISTS parking_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE SET NULL,
  slot_name VARCHAR(50) NOT NULL, -- Denormalized for history
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  amount_charged DECIMAL(10,2) NOT NULL,
  was_overtime BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BILLING CONFIG TABLE (Global settings)
-- ============================================
CREATE TABLE IF NOT EXISTS billing_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rate_per_hour DECIMAL(10,2) DEFAULT 25.00, -- PHP 25/hr
  overtime_rate_per_hour DECIMAL(10,2) DEFAULT 100.00, -- PHP 100/hr after overtime
  overtime_threshold_minutes INTEGER DEFAULT 180, -- 3 hours
  currency VARCHAR(10) DEFAULT 'PHP',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_slot_status_slot_id ON slot_status(slot_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_slot_id ON sensor_readings(slot_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at ON sensor_readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
CREATE INDEX IF NOT EXISTS idx_device_commands_slot_id ON device_commands(slot_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_slot_id ON parking_sessions(slot_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_ended_at ON parking_sessions(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_started_at ON parking_sessions(started_at DESC);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE parking_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE slot_status;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE device_status;
ALTER PUBLICATION supabase_realtime ADD TABLE device_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE parking_sessions;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate billing
CREATE OR REPLACE FUNCTION calculate_billing(
  p_occupied_since TIMESTAMP WITH TIME ZONE,
  p_rate_per_hour DECIMAL DEFAULT 25.00,
  p_overtime_rate DECIMAL DEFAULT 100.00,
  p_overtime_threshold_minutes INTEGER DEFAULT 180
)
RETURNS DECIMAL AS $$
DECLARE
  v_minutes_parked INTEGER;
  v_regular_minutes INTEGER;
  v_overtime_minutes INTEGER;
  v_total DECIMAL;
BEGIN
  IF p_occupied_since IS NULL THEN
    RETURN 0;
  END IF;
  
  v_minutes_parked := EXTRACT(EPOCH FROM (NOW() - p_occupied_since)) / 60;
  
  IF v_minutes_parked <= p_overtime_threshold_minutes THEN
    -- Regular rate only
    v_total := (v_minutes_parked / 60.0) * p_rate_per_hour;
  ELSE
    -- Regular rate for first 3 hours + overtime rate for rest
    v_regular_minutes := p_overtime_threshold_minutes;
    v_overtime_minutes := v_minutes_parked - p_overtime_threshold_minutes;
    v_total := (v_regular_minutes / 60.0) * p_rate_per_hour 
             + (v_overtime_minutes / 60.0) * p_overtime_rate;
  END IF;
  
  RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_parking_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slot_status_updated_at
  BEFORE UPDATE ON slot_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_status_updated_at
  BEFORE UPDATE ON device_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default billing config
INSERT INTO billing_config (rate_per_hour, overtime_rate_per_hour, overtime_threshold_minutes, currency)
VALUES (25.00, 100.00, 180, 'PHP')
ON CONFLICT DO NOTHING;

-- Insert default device status
INSERT INTO device_status (device_id, is_connected, rssi)
VALUES ('HC-05-MAIN', false, -100)
ON CONFLICT (device_id) DO NOTHING;

-- Insert sample parking slots
INSERT INTO parking_slots (name, is_placeholder) VALUES
  ('P1', false),
  ('P2', false),
  ('P3', false),
  ('P4', false),
  ('P5', false)
ON CONFLICT DO NOTHING;

-- Insert corresponding slot status for each slot
INSERT INTO slot_status (slot_id, status, occupied_since)
SELECT id, 'vacant', NULL FROM parking_slots WHERE NOT is_placeholder
ON CONFLICT DO NOTHING;
