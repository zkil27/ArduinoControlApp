import { BluetoothDeviceModal } from '@/components/BluetoothDeviceModal';
import { BluetoothHeader } from '@/components/BluetoothHeader';
import { WebHeader } from '@/components/WebHeader';
import { Colors, FontFamily } from '@/constants/theme';
import { useBluetooth } from '@/hooks/use-bluetooth';
import { useParkingSlots } from '@/hooks/use-parking';
import { ParkingSession, useParkingHistory } from '@/hooks/use-parking-history';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Log entry type
interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'SYS' | 'BT' | 'SLOT' | 'EVT' | 'SENSOR' | 'CMD';
  message: string;
}

// Format currency
function formatCurrency(amount: number | undefined | null): string {
  const value = amount ?? 0;
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format duration for session history
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours >= 1 && minutes % 60 === 0) return `${Math.floor(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

// Get current date formatted
function getCurrentDate(): string {
  const now = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[now.getMonth()];
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}:${day}:${year}`;
}

// Truncate session ID
function truncateId(id: string): string {
  return `..${id.slice(-4)}`;
}

// Session Row Component
function SessionHistoryRow({ session }: { session: ParkingSession }) {
  const id = truncateId(session.id);
  const slot = session.slot_name.padEnd(5);
  const duration = formatDuration(session.duration_minutes).padEnd(6);
  const amount = session.amount_charged.toFixed(2);
  const isOvertime = session.was_overtime;
  
  return (
    <Text style={styles.sessionRow}>
      {id}   {slot} {duration} {amount}{isOvertime ? '*' : ''}
    </Text>
  );
}

// Peak Hours Chart Component
function PeakHoursChart({ sessions }: { sessions: ParkingSession[] }) {
  // Calculate hourly data from sessions (6AM to 12AM = 18 hours)
  const { hourlyData, hourLabels, maxVal } = useMemo(() => {
    // Use 6AM to 11PM range (18 hours)
    const startHour = 6;
    const endHour = 23;
    const hours: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }
    
    const counts = new Array(hours.length).fill(0);
    
    sessions.forEach(session => {
      const startTime = new Date(session.started_at);
      const hour = startTime.getHours();
      const idx = hours.indexOf(hour);
      if (idx !== -1) counts[idx]++;
    });
    
    // Find max value (minimum 5 for y-axis)
    const max = Math.max(...counts, 5);
    
    // Create hour labels (show every 2 hours)
    const labels = hours.filter((_, i) => i % 3 === 0).map(h => {
      if (h === 0) return '12AM';
      if (h === 12) return '12PM';
      if (h < 12) return `${h}AM`;
      return `${h - 12}PM`;
    });
    
    return { hourlyData: counts, hourLabels: labels, maxVal: max };
  }, [sessions]);

  const chartHeight = 100;
  const chartWidth = 320;
  const pointSpacing = chartWidth / (hourlyData.length - 1);
  
  // Generate points for the line
  const points = hourlyData.map((val, i) => ({
    x: i * pointSpacing,
    y: chartHeight - (val / maxVal) * chartHeight,
  }));

  // Generate Y-axis labels based on max value
  const yLabels = useMemo(() => {
    const step = Math.ceil(maxVal / 5);
    return [5, 4, 3, 2, 1].map(n => n * step);
  }, [maxVal]);

  return (
    <View style={styles.chartContainer}>
      {/* Y-axis labels */}
      <View style={styles.yAxis}>
        {yLabels.map((n, i) => (
          <Text key={i} style={styles.yLabel}>{n}</Text>
        ))}
      </View>
      
      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Line segments */}
        {points.slice(0, -1).map((point, i) => {
          const nextPoint = points[i + 1];
          const dx = nextPoint.x - point.x;
          const dy = nextPoint.y - point.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          return (
            <View
              key={i}
              style={[
                styles.lineSegment,
                {
                  left: point.x,
                  top: point.y,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        
        {/* Data points for non-zero values */}
        {points.map((point, i) => 
          hourlyData[i] > 0 ? (
            <View
              key={`dot-${i}`}
              style={[
                styles.dataPoint,
                { left: point.x - 3, top: point.y - 3 },
              ]}
            />
          ) : null
        )}
      </View>
      
      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {hourLabels.map((label, i) => (
          <Text key={i} style={styles.xLabel}>{label}</Text>
        ))}
      </View>
      
      {/* No data message */}
      {sessions.length === 0 && (
        <View style={styles.noDataOverlay}>
          <Text style={styles.noDataText}>No session data yet</Text>
        </View>
      )}
    </View>
  );
}

// System Logs Component - Real-time logs
function SystemLogs({ 
  isConnected, 
  logs 
}: { 
  isConnected: boolean; 
  logs: LogEntry[];
}) {
  const [uptime, setUptime] = useState('00:00:00');
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
      const mins = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      setUptime(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'CMD': return '#4ade80';    // Green for commands
      case 'EVT': return '#facc15';    // Yellow for events
      case 'SYS': return '#60a5fa';    // Blue for system
      case 'SENSOR': return '#c084fc'; // Purple for sensor
      default: return '#a8a8a8';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CMD': return '▶';
      case 'EVT': return '◆';
      case 'SYS': return '●';
      case 'SENSOR': return '◈';
      default: return '○';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const now = new Date();

  return (
    <ScrollView 
      style={styles.logsScrollView} 
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
    >
      {/* Connection status */}
      <Text style={styles.logText}>
        <Text style={{ color: '#555' }}>{formatTime(now)} </Text>
        <Text style={{ color: isConnected ? '#4ade80' : '#f87171' }}>■ </Text>
        <Text style={{ color: '#888' }}>[</Text>
        <Text style={{ color: '#60a5fa' }}>BT</Text>
        <Text style={{ color: '#888' }}>] </Text>
        <Text style={{ color: isConnected ? '#4ade80' : '#f87171' }}>
          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </Text>
      </Text>
      
      {/* Uptime */}
      <Text style={styles.logText}>
        <Text style={{ color: '#555' }}>{formatTime(now)} </Text>
        <Text style={{ color: '#60a5fa' }}>● </Text>
        <Text style={{ color: '#888' }}>[</Text>
        <Text style={{ color: '#60a5fa' }}>SYS</Text>
        <Text style={{ color: '#888' }}>] </Text>
        <Text style={{ color: '#ededed' }}>UPTIME </Text>
        <Text style={{ color: '#4ade80' }}>{uptime}</Text>
      </Text>
      
      {/* Real-time logs - show all logs, not just 10 */}
      {logs.map((log) => (
        <Text key={log.id} style={styles.logText}>
          <Text style={{ color: '#555' }}>{formatTime(log.timestamp)} </Text>
          <Text style={{ color: getLogColor(log.type) }}>{getTypeIcon(log.type)} </Text>
          <Text style={{ color: '#888' }}>[</Text>
          <Text style={{ color: getLogColor(log.type) }}>{log.type}</Text>
          <Text style={{ color: '#888' }}>] </Text>
          <Text style={{ color: '#ededed' }}>{log.message}</Text>
        </Text>
      ))}
      
      {logs.length === 0 && (
        <Text style={styles.logText}>
          <Text style={{ color: '#555' }}>{formatTime(now)} </Text>
          <Text style={{ color: '#60a5fa' }}>● </Text>
          <Text style={{ color: '#888' }}>[</Text>
          <Text style={{ color: '#60a5fa' }}>SYS</Text>
          <Text style={{ color: '#888' }}>] </Text>
          <Text style={{ color: '#666' }}>Awaiting events...</Text>
        </Text>
      )}
    </ScrollView>
  );
}

export default function StatisticsScreen() {
  const router = useRouter();
  const { 
    isConnected: btConnected, 
    rssi: btRssi,
    availableDevices,
    isScanning,
    error: btError,
    scanForDevices,
    connectToDevice,
    disconnect,
    connectedDevice,
  } = useBluetooth();
  const { sessions, fetchRecentSessions, getTodayStats } = useParkingHistory();
  const { slots } = useParkingSlots();
  
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({ sessions: 0, revenue: 0, usageRate: 0 });
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [btModalVisible, setBtModalVisible] = useState(false);

  // Add a new log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 20));
  }, []);

  // Subscribe to real-time changes for logging
  useEffect(() => {
    // Subscribe to parking_slots changes
    const slotsChannel = supabase
      .channel('stats_slots_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_slots' },
        () => {
          addLog('SYS', 'Parking slots changed');
        }
      )
      .subscribe();

    // Subscribe to slot_status changes
    const statusChannel = supabase
      .channel('stats_status_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_status' },
        (payload) => {
          addLog('SYS', 'Slot status changed');
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            if (newData.status) {
              // Find slot name from slots array
              const slot = slots.find(s => s.id === newData.slot_id);
              const slotName = slot?.name || 'Unknown';
              addLog('EVT', `${slotName} > ${newData.status.toUpperCase()}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to device_commands for ENABLE/DISABLE logs
    const commandsChannel = supabase
      .channel('stats_commands_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_commands' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const cmd = payload.new as any;
            const slot = slots.find(s => s.id === cmd.slot_id);
            const slotName = slot?.name || 'Unknown';
            if (cmd.command_type === 'DISABLE_SLOT') {
              addLog('CMD', `Sending DISABLE command for: ${slotName}`);
            } else if (cmd.command_type === 'ENABLE_SLOT') {
              addLog('CMD', `Sending ENABLE command for: ${slotName}`);
            } else if (cmd.command_type === 'PING_LED_5X') {
              addLog('CMD', `Sending PING command for: ${slotName}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to sensor_readings
    const sensorChannel = supabase
      .channel('stats_sensor_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const reading = payload.new as any;
            const slot = slots.find(s => s.id === reading.slot_id);
            const slotName = slot?.name || 'P?';
            addLog('SENSOR', `${slotName} LDR: ${reading.photoresistor_value}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(commandsChannel);
      supabase.removeChannel(sensorChannel);
    };
  }, [addLog, slots]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      await fetchRecentSessions();
      const stats = await getTodayStats();
      if (stats) {
        const usageRate = Math.min(Math.round((stats.total_sessions / 20) * 100), 100);
        setTodayStats({
          sessions: stats.total_sessions,
          revenue: stats.total_revenue,
          usageRate,
        });
      }
    };
    loadData();
  }, [fetchRecentSessions, getTodayStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecentSessions();
    const stats = await getTodayStats();
    if (stats) {
      const usageRate = Math.min(Math.round((stats.total_sessions / 20) * 100), 100);
      setTodayStats({
        sessions: stats.total_sessions,
        revenue: stats.total_revenue,
        usageRate,
      });
    }
    setRefreshing(false);
  };

  // Get last 4 sessions for display
  const recentSessions = sessions.slice(0, 4);

  // Check if we're on web
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Show WebHeader on web, BluetoothHeader on mobile */}
      {isWeb ? (
        <WebHeader 
          title="STATISTICS" 
          isConnected={btConnected} 
          rssi={btRssi} 
        />
      ) : (
        <BluetoothHeader 
          rssi={btRssi} 
          isConnected={btConnected}
          onStatusPress={() => {
            scanForDevices();
            setBtModalVisible(true);
          }}
          onSettingsPress={() => router.push('/settings')}
        />
      )}
      
      {/* Bluetooth Device Selection Modal */}
      <BluetoothDeviceModal
        visible={btModalVisible}
        onClose={() => setBtModalVisible(false)}
        devices={availableDevices}
        connectedDevice={connectedDevice}
        isScanning={isScanning}
        onScan={scanForDevices}
        onConnect={connectToDevice}
        onDisconnect={disconnect}
        error={btError}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ededed"
            colors={['#ededed']}
          />
        }
      >
        {/* Top Row: Date + Usage Rate/Sessions */}
        <View style={styles.topRow}>
          {/* Left Column: Date + Revenue */}
          <View style={styles.leftColumn}>
            {/* Date Card */}
            <View style={[styles.card, styles.dateCard]}>
              <Text style={styles.cardLabel}>Date:</Text>
              <Text style={styles.dateText}>{getCurrentDate()}</Text>
            </View>
            
            {/* Total Revenue Card */}
            <View style={[styles.card, styles.revenueCard]}>
              <Text style={styles.cardLabel}>Total Revenue:</Text>
              <Text style={styles.revenueValue}>{formatCurrency(todayStats.revenue)}</Text>
            </View>
          </View>
          
          {/* Usage Rate / Sessions Card */}
          <View style={[styles.card, styles.usageCard]}>
            <Text style={styles.cardLabel}>Usage Rate:</Text>
            <Text style={styles.usageValue}>{todayStats.usageRate}%</Text>
            <Text style={[styles.cardLabel, { marginTop: 12 }]}>Sessions:</Text>
            <Text style={styles.sessionsValue}>{todayStats.sessions}</Text>
          </View>
        </View>
        
        {/* Session History Card */}
        <View style={[styles.card, styles.historyCard]}>
          <View style={styles.historyHeader}>
            <Text style={styles.cardLabel}>Session History</Text>
            <Text style={styles.overtimeNote}>* Overtime fee applied</Text>
          </View>
          <View style={styles.historyContent}>
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <SessionHistoryRow key={session.id} session={session} />
              ))
            ) : (
              <Text style={styles.emptyText}>No sessions yet</Text>
            )}
          </View>
        </View>
        
        {/* Peak Hours Chart */}
        <View style={[styles.card, styles.peakHoursCard]}>
          <Text style={styles.cardLabel}>Peak Hours:</Text>
          <PeakHoursChart sessions={sessions} />
        </View>
        
        {/* System Logs */}
        <View style={[styles.card, styles.logsCard]}>
          <Text style={[styles.cardLabel, { color: '#1f4fce' }]}>System Logs:</Text>
          <SystemLogs isConnected={btConnected} logs={systemLogs} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 100,
  },
  topRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  leftColumn: {
    flex: 1,
    gap: 10,
  },
  card: {
    backgroundColor: '#0a0909',
    borderWidth: 1,
    borderColor: '#272727',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: '#ededed',
  },
  dateCard: {
    height: 63,
    paddingTop: 4,
    paddingHorizontal: 8,
    
  },
  dateText: {
    fontFamily: FontFamily.mono,
    fontSize: 24,
    fontWeight: '700',
    color: '#ededed',
    letterSpacing: 3.36,
    marginTop: 0,
  },
  usageCard: {
    width: 102,
    height: 165,
    paddingTop: 11,
    paddingHorizontal: 7,
  },
  usageValue: {
    fontFamily: FontFamily.mono,
    fontSize: 36,
    fontWeight: '700',
    color: '#ededed',
    marginTop: -4,
  },
  sessionsValue: {
    fontFamily: FontFamily.mono,
    fontSize: 36,
    fontWeight: '700',
    color: '#ededed',
    marginTop: -4,
  },
  revenueCard: {
    height: 92,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  revenueValue: {
    fontFamily: FontFamily.mono,
    fontSize: 36,
    fontWeight: '700',
    color: '#42bc2b',
    marginTop: 10,
  },
  historyCard: {
    minHeight: 120,
    padding: 8,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overtimeNote: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontStyle: 'italic',
    color: '#ededed',
  },
  historyContent: {
    gap: 4,
  },
  sessionRow: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: '#ededed',
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  peakHoursCard: {
    height: 184,
    padding: 8,
    marginBottom: 10,
  },
  chartContainer: {
    flex: 1,
    marginTop: 15,
  },
  yAxis: {
    position: 'absolute',
    left: 4,
    top: 0,
    height: 100,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 1.12,
  },
  chartArea: {
    marginLeft: 20,
    marginRight: 10,
    height: 121,
    position: 'relative',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#d41f7c',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d41f7c',
  },
  noDataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: '#666',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
  },
  xLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: '#ededed',
    letterSpacing: 1.12,
  },
  logsCard: {
    height: 180,
    padding: 8,
  },
  logsScrollView: {
    flex: 1,
    marginTop: 8,
  },
  logText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: '#1f4fce',
    lineHeight: 14,
  },
  timeIndicatorContainer: {
    height: 4,
    marginTop: 4,
  },
  timeIndicatorLine: {
    height: 4,
    backgroundColor: '#d41f7c',
  },
});
