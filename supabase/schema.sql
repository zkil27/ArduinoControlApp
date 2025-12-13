-- Arduino Control App - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- e.g., 'arduino_uno', 'esp32', 'esp8266'
  mac_address VARCHAR(17), -- Bluetooth MAC address
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  sensor_type VARCHAR(100) NOT NULL, -- e.g., 'temperature', 'humidity', 'light'
  value DECIMAL NOT NULL,
  unit VARCHAR(20), -- e.g., 'C', '%', 'lux'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commands table (for sending commands to Arduino)
CREATE TABLE IF NOT EXISTS commands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  command VARCHAR(255) NOT NULL, -- e.g., 'LED_ON', 'MOTOR_SPEED:50'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'executed', 'failed'
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON sensor_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commands_device_id ON commands(device_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);

-- Row Level Security (RLS)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view their own devices" ON devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" ON devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" ON devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" ON devices
  FOR DELETE USING (auth.uid() = user_id);

-- Sensor data policies (based on device ownership)
CREATE POLICY "Users can view sensor data for their devices" ON sensor_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM devices WHERE devices.id = sensor_data.device_id AND devices.user_id = auth.uid())
  );

CREATE POLICY "Users can insert sensor data for their devices" ON sensor_data
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM devices WHERE devices.id = sensor_data.device_id AND devices.user_id = auth.uid())
  );

-- Commands policies
CREATE POLICY "Users can view commands for their devices" ON commands
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM devices WHERE devices.id = commands.device_id AND devices.user_id = auth.uid())
  );

CREATE POLICY "Users can insert commands for their devices" ON commands
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM devices WHERE devices.id = commands.device_id AND devices.user_id = auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
