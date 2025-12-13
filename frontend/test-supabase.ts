/**
 * Supabase Connection Test
 * Run this to verify your Supabase setup is working correctly
 * 
 * Usage: npx tsx test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env file FIRST
config();

// Create Supabase client directly (don't import lib/supabase.ts to avoid hoisting issues)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error(`   EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
  console.error(`   EXPO_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Found' : '❌ Missing'}`);
  console.error('\n💡 Make sure frontend/.env exists with your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n');

  // Test 1: Check if client is initialized
  console.log('✅ Supabase client initialized');
  console.log(`   URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL}\n`);

  // Test 2: Test database connection
  console.log('📡 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Database connection failed:');
      console.log(`   Error: ${error.message}`);
      console.log('   Make sure you ran the schema.sql in Supabase SQL Editor');
      return;
    }

    console.log('✅ Database connection successful!');
    console.log(`   Tables accessible: devices table found\n`);
  } catch (err: any) {
    console.log('❌ Connection error:', err.message);
    return;
  }

  // Test 3: Try inserting a test device
  console.log('🔨 Testing insert operation...');
  try {
    const testDevice = {
      name: 'Test Device',
      type: 'test',
      mac_address: '00:00:00:00:00:00',
      is_online: false,
    };

    const { data, error } = await supabase
      .from('devices')
      .insert([testDevice])
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
        console.log('⚠️  Insert blocked by Row Level Security');
        console.log('   This is expected if you\'re not authenticated!');
        console.log('   RLS is working correctly ✅\n');
      } else {
        console.log('❌ Insert failed:', error.message);
        return;
      }
    } else {
      console.log('✅ Insert successful!');
      console.log(`   Created device with ID: ${data.id}`);

      // Clean up - delete the test device
      const { error: deleteError } = await supabase
        .from('devices')
        .delete()
        .eq('id', data.id);

      if (!deleteError) {
        console.log('✅ Test device cleaned up\n');
      }
    }
  } catch (err: any) {
    console.log('❌ Insert test error:', err.message);
    return;
  }

  // Test 4: Test real-time subscriptions
  console.log('🔄 Testing real-time subscriptions...');
  try {
    const channel = supabase
      .channel('test_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          console.log('📨 Real-time event received:', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscriptions working!\n');
          supabase.removeChannel(channel);
          
          console.log('🎉 All tests passed! Supabase is ready to use.\n');
          process.exit(0);
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time subscription failed');
          process.exit(1);
        }
      });

    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('⚠️  Real-time test timeout');
      supabase.removeChannel(channel);
      process.exit(1);
    }, 5000);

  } catch (err: any) {
    console.log('❌ Real-time test error:', err.message);
    return;
  }
}

// Run the test
testSupabaseConnection().catch((err) => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
