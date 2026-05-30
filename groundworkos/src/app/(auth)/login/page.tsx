'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow hazard-stripe-diagonal" />
            <h1 className="text-3xl font-condensed font-bold tracking-tight">
              GROUNDWORK<span className="text-yellow">OS</span>
            </h1>
          </div>
          <p className="text-muted text-sm">Sign in to your CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="you@company.co.uk"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            loading={loading}
          >
            Sign In
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted hover:text-yellow transition-colors"
              onClick={() => router.push('/forgot-password')}
            >
              Forgot password?
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted">
            Need access?{' '}
            <button
              type="button"
              className="text-yellow hover:underline"
              onClick={() => router.push('/signup')}
            >
              Request access
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
