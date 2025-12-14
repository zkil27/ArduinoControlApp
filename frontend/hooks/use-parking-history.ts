/**
 * Hook to fetch parking session history from Supabase
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface ParkingSession {
  id: string;
  slot_name: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  amount_charged: number;
  was_overtime: boolean;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total_sessions: number;
  total_revenue: number;
  total_duration_minutes: number;
  overtime_sessions: number;
}

export function useParkingHistory() {
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent sessions
  const fetchRecentSessions = useCallback(async (limit: number = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('parking_sessions')
        .select('*')
        .order('ended_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
        return [];
      }

      setSessions(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch sessions by date range
  const fetchSessionsByDateRange = useCallback(async (
    startDate: Date,
    endDate: Date
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('parking_sessions')
        .select('*')
        .gte('started_at', startDate.toISOString())
        .lte('ended_at', endDate.toISOString())
        .order('ended_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return [];
      }

      setSessions(data || []);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate daily statistics
  const calculateDailyStats = useCallback((sessionList: ParkingSession[]): DailyStats[] => {
    const statsMap = new Map<string, DailyStats>();

    sessionList.forEach(session => {
      const date = session.ended_at.split('T')[0]; // Get YYYY-MM-DD

      const existing = statsMap.get(date) || {
        date,
        total_sessions: 0,
        total_revenue: 0,
        total_duration_minutes: 0,
        overtime_sessions: 0,
      };

      statsMap.set(date, {
        ...existing,
        total_sessions: existing.total_sessions + 1,
        total_revenue: existing.total_revenue + session.amount_charged,
        total_duration_minutes: existing.total_duration_minutes + session.duration_minutes,
        overtime_sessions: existing.overtime_sessions + (session.was_overtime ? 1 : 0),
      });
    });

    // Sort by date descending
    return Array.from(statsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, []);

  // Calculate today's stats from existing sessions (cached, no fetch)
  const calculateTodayStats = useCallback((): DailyStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter sessions for today from existing data
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.ended_at);
      return sessionDate >= today && sessionDate < tomorrow;
    });

    // Calculate stats
    let total_sessions = 0;
    let total_revenue = 0;
    let total_duration_minutes = 0;
    let overtime_sessions = 0;

    todaySessions.forEach(session => {
      total_sessions++;
      total_revenue += session.amount_charged;
      total_duration_minutes += session.duration_minutes;
      if (session.was_overtime) overtime_sessions++;
    });

    return {
      date: today.toISOString().split('T')[0],
      total_sessions,
      total_revenue,
      total_duration_minutes,
      overtime_sessions,
    };
  }, [sessions]);

  // Get today's stats (with option to use cache or fetch fresh)
  const getTodayStats = useCallback(async (useCache: boolean = false) => {
    // If using cache and we have sessions, calculate from memory
    if (useCache && sessions.length > 0) {
      return calculateTodayStats();
    }

    // Otherwise fetch fresh data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = await fetchSessionsByDateRange(today, tomorrow);
    const stats = calculateDailyStats(todaySessions);
    
    return stats[0] || {
      date: today.toISOString().split('T')[0],
      total_sessions: 0,
      total_revenue: 0,
      total_duration_minutes: 0,
      overtime_sessions: 0,
    };
  }, [sessions, calculateTodayStats, fetchSessionsByDateRange, calculateDailyStats]);

  // Get weekly stats (last 7 days)
  const getWeeklyStats = useCallback(async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const weekSessions = await fetchSessionsByDateRange(startDate, endDate);
    return calculateDailyStats(weekSessions);
  }, [fetchSessionsByDateRange, calculateDailyStats]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('parking_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parking_sessions',
        },
        (payload) => {
          const newSession = payload.new as ParkingSession;
          setSessions(prev => [newSession, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // NOTE: Removed auto-fetch on mount to prevent duplicate fetches
  // Components should call fetchRecentSessions() when they need data

  return {
    sessions,
    dailyStats,
    isLoading,
    error,
    fetchRecentSessions,
    fetchSessionsByDateRange,
    calculateDailyStats,
    calculateTodayStats,
    getTodayStats,
    getWeeklyStats,
  };
}
