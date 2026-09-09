import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Activity } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signInWithGitHub } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
    }
  };

  const handleGitHub = async () => {
    setError(null);
    setSubmitting(true);
    const { error: err } = await signInWithGitHub();
    // On success the browser is leaving for GitHub; only a failure needs the form back.
    if (err) {
      setSubmitting(false);
      setError(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-stone-50 to-stone-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-600/20">
            <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 text-center">
            Gestational Diabetes Tracker
          </h1>
          <p className="text-sm text-stone-500 mt-2 text-center">
            Track meals, glucose, and daily metrics
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleGitHub}
          disabled={submitting}
        >
          Continue with GitHub
        </Button>

        <div className="flex items-center gap-3 my-6">
          <span className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Please wait...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
