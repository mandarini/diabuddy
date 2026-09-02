import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Activity } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setSubmitting(false);
    if (err) {
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
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="w-full text-center text-sm text-teal-600 hover:text-teal-700 mt-4 transition-colors"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
