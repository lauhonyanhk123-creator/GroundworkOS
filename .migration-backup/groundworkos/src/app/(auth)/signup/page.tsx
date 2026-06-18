'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setError('Could not create account. Please try again or contact your administrator.');
      } else {
        setSubmitted(true);
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
            <div
              className="w-10 h-10 bg-yellow flex items-center justify-center"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 2px,
                  rgba(0,0,0,0.3) 2px,
                  rgba(0,0,0,0.3) 4px
                )`,
              }}
            />
            <h1 className="text-3xl font-condensed font-bold tracking-tight">
              GROUNDWORK<span className="text-yellow">OS</span>
            </h1>
          </div>
          <p className="text-muted text-sm">Request access</p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded text-success text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Account created</p>
                <p className="text-success/80">
                  Check your email at <span className="font-mono">{email}</span> to confirm your
                  address, then sign in to set up your company — or ask your administrator to
                  add you to an existing one.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="w-full text-sm text-muted hover:text-yellow transition-colors"
              onClick={() => router.push('/login')}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
              >
                Email address
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
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
                placeholder="Re-enter your password"
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
              Request access
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted hover:text-yellow transition-colors"
                onClick={() => router.push('/login')}
              >
                Already have access? Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
