import { supabase } from '@/lib/supabase/client';
import { describeFunctionError } from '@/lib/supabase/functionError';

export type DoctorReportResult =
  | { kind: 'csv'; csv: string }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

// The server-side report exists only for users the `doctor-report` flag admits; everyone else
// gets `unavailable` and the caller falls back to building the CSV locally.
export async function fetchDoctorReport(): Promise<DoctorReportResult> {
  const { data, error } = await supabase.functions.invoke<string>('doctor-report');
  if (error) {
    const info = await describeFunctionError(error);
    if (info.status === 404 && info.code === 'feature_disabled') return { kind: 'unavailable' };
    return { kind: 'error', message: info.message };
  }
  if (typeof data !== 'string') return { kind: 'error', message: 'Unexpected response from the report service' };
  return { kind: 'csv', csv: data };
}
