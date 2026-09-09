import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { DailyMetrics } from '@/lib/types';

export function useDailyMetrics(dayDate: string) {
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('metric_date', dayDate)
      .maybeSingle();
    if (error) {
      console.error('Error fetching daily metrics:', error.message);
      setMetrics(null);
    } else {
      setMetrics(data as DailyMetrics | null);
    }
    setLoading(false);
  }, [dayDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

export function useAllDailyMetrics() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false });
    if (error) {
      console.error('Error fetching daily metrics:', error.message);
      setMetrics([]);
    } else {
      setMetrics(data as DailyMetrics[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}

export async function upsertDailyMetrics(
  dayDate: string,
  updates: Partial<DailyMetrics>
): Promise<{ data: DailyMetrics | null; error: string | null }> {
  const { data, error } = await supabase
    .from('daily_metrics')
    .upsert(
      { metric_date: dayDate, ...updates },
      { onConflict: 'user_id,metric_date' }
    )
    .select()
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as DailyMetrics | null, error: null };
}
