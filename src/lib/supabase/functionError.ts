import { FunctionsHttpError } from '@supabase/supabase-js';

export interface FunctionErrorInfo {
  status: number | null;
  code: string | null;
  message: string;
}

// Edge Functions answer failures with `{ error }` and, from the feature-flag entry,
// `{ error: 'feature_disabled', flag }`; the HTTP status travels on the response.
export async function describeFunctionError(error: unknown): Promise<FunctionErrorInfo> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    try {
      const body = await error.context.json();
      const message = typeof body?.error === 'string' ? body.error : error.message;
      return { status, code: typeof body?.error === 'string' ? body.error : null, message };
    } catch {
      return { status, code: null, message: error.message };
    }
  }
  return { status: null, code: null, message: error instanceof Error ? error.message : 'Request failed' };
}
