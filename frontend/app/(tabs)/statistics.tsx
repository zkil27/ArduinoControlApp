import { BluetoothHeader } from '@/components/BluetoothHeader';
import { Colors, FontFamily, FontSizes, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/hooks/use-bluetooth';
import { DailyStats, ParkingSession, useParkingHistory } from '@/hooks/use-parking-history';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// Format duration in hours and minutes
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Format currency
function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Session row component
function SessionRow({ session }: { session: ParkingSession }) {
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionSlot}>
        <Text style={styles.slotName}>{session.slot_name}</Text>
        {session.was_overtime && (
          <Text style={styles.overtimeBadge}>OT</Text>
        )}
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTime}>{formatDate(session.ended_at)}</Text>
        <Text style={styles.sessionDuration}>{formatDuration(session.duration_minutes)}</Text>
      </View>
      <Text style={[
        styles.sessionAmount,
        session.was_overtime && styles.overtimeAmount
      ]}>
        {formatCurrency(session.amount_charged)}
      </Text>
    </View>
  );
}

// Stats card component
function StatsCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={styles.statsValue}>{value}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function StatisticsScreen() {
  const { isConnected: btConnected, rssi: btRssi } = useBluetooth();
  const {
    sessions,
    isLoading,
    fetchRecentSessions,
    getTodayStats,
  } = useParkingHistory();
  
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load today's stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getTodayStats();
      setTodayStats(stats);
    };
    loadStats();
  }, [getTodayStats]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecentSessions();
    const stats = await getTodayStats();
    setTodayStats(stats);
    setRefreshing(false);
  };

  const renderSession = ({ item }: { item: ParkingSession }) => (
    <SessionRow session={item} />
  );

  const ListHeader = () => (
    <>
      {/* Today's Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.statsRow}>
          <StatsCard
            title="Sessions"
            value={String(todayStats?.total_sessions ?? 0)}
          />
          <StatsCard
            title="Revenue"
            value={formatCurrency(todayStats?.total_revenue ?? 0)}
          />
          <StatsCard
            title="Overtime"
            value={String(todayStats?.overtime_sessions ?? 0)}
            subtitle="sessions"
          />
        </View>
      </View>

      {/* Recent Sessions Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
      </View>
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📊</Text>
      <Text style={styles.emptyText}>No parking sessions yet</Text>
      <Text style={styles.emptySubtext}>
        Sessions will appear here when vehicles leave parking spots
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <BluetoothHeader
        rssi={btRssi}
        isConnected={btConnected}
      />
      
      {isLoading && sessions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accentBlue}
              colors={[Colors.accentBlue]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statsTitle: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statsValue: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xl,
    color: Colors.text,
    fontWeight: '600',
  },
  statsSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  slotName: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  overtimeBadge: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.warning,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    overflow: 'hidden',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sessionTime: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sessionDuration: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sessionAmount: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.md,
    color: Colors.accentGreen,
    fontWeight: '600',
  },
  overtimeAmount: {
    color: Colors.warning,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: FontFamily.mono,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
