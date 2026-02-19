import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface SavedProgression {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  chords: Record<string, unknown>[];
  voicings: number[];
  created_at: string;
}

export function useSavedProgressions(user: User | null) {
  const [progressions, setProgressions] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProgressions = useCallback(async () => {
    if (!user) { setProgressions([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('saved_progressions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setProgressions(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProgressions(); }, [fetchProgressions]);

  const saveProgression = useCallback(async (
    name: string,
    settings: Record<string, unknown>,
    chords: Record<string, unknown>[],
    voicings: number[]
  ) => {
    if (!user) return;
    await supabase.from('saved_progressions').insert({
      user_id: user.id,
      name,
      settings,
      chords,
      voicings,
    });
    await fetchProgressions();
  }, [user, fetchProgressions]);

  const deleteProgression = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('saved_progressions').delete().eq('id', id).eq('user_id', user.id);
    setProgressions(prev => prev.filter(p => p.id !== id));
  }, [user]);

  return { progressions, loading, saveProgression, deleteProgression, refetch: fetchProgressions };
}
