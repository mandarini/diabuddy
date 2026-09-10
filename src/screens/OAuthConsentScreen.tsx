import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { AuthScreen } from '@/screens/AuthScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingScreen } from '@/components/ui/Loading';

// Supabase Auth sends the user here with `?authorization_id=…` when an OAuth client asks for
// access. The decision goes back through `supabase.auth.oauth` and ends in a redirect to the
// client, so the page never sees tokens or codes.
export function OAuthConsentScreen() {
  const { session, loading } = useAuth();
  const signedIn = session !== null;
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id');
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!signedIn || !authorizationId) return;
    let cancelled = false;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      // A client this user already approved for these scopes skips the screen.
      if (!('authorization_id' in data)) {
        window.location.href = data.redirect_url;
        return;
      }
      setDetails(data);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, authorizationId]);

  const decide = async (approve: boolean) => {
    if (!authorizationId) return;
    setDeciding(true);
    setError(null);
    const { data, error: err } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (err) {
      setDeciding(false);
      setError(err.message);
      return;
    }
    window.location.href = data.redirect_url;
  };

  if (!authorizationId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <p className="text-center text-stone-600">Missing authorization request.</p>
      </div>
    );
  }
  if (loading) return <LoadingScreen />;
  // Sign-in returns to this exact URL so the authorization request survives the round trip.
  if (!session) return <AuthScreen redirectTo={window.location.href} />;

  const scopes = details?.scope.split(' ').filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <Card className="p-6 w-full max-w-sm space-y-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-stone-800">
          <ShieldCheck size={20} className="text-teal-600" /> Authorize access
        </h1>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {!details && !error && <p className="text-sm text-stone-500">Loading request…</p>}
        {details && (
          <>
            <p className="text-sm text-stone-600">
              <strong>{details.client.name || 'An application'}</strong> wants to access your
              DiaBuddy data as <strong>{details.user.email}</strong>.
            </p>
            {scopes.length > 0 && (
              <ul className="text-sm text-stone-500 list-disc pl-5">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-stone-400 break-all">Returns to {details.redirect_uri}</p>
            <div className="flex gap-3">
              <Button onClick={() => decide(true)} disabled={deciding} className="flex-1">
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => decide(false)}
                disabled={deciding}
                className="flex-1"
              >
                Deny
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
