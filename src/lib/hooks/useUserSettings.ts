import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { UserSettings } from '@/lib/types';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('Error fetching settings:', error.message);
      setSettings(null);
    } else {
      setSettings(data as UserSettings | null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

export async function upsertUserSettings(
  updates: Partial<UserSettings>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(updates, { onConflict: 'user_id' });
  return { error: error?.message ?? null };
}
