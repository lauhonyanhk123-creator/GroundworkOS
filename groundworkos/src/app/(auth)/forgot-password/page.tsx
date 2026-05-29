'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });

      if (error) {
        setError('Could not send reset email. Please try again.');
      } else {
        setSent(true);
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
          <p className="text-muted text-sm">Reset your password</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded text-success text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Check your email</p>
                <p className="text-success/80">
                  We&apos;ve sent a password reset link to <span className="font-mono">{email}</span>.
                  The link expires in 1 hour.
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
              Send reset link
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted hover:text-yellow transition-colors"
                onClick={() => router.push('/login')}
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
