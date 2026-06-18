'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useRef(createClient());

  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      try {
        const { data: { user } } = await supabase.current.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        const { data: memberships, error: membershipError } = await supabase.current
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1);

        if (membershipError) throw membershipError;

        if (memberships && memberships.length > 0) {
          router.replace('/dashboard');
          return;
        }

        setEmail(user.email ?? '');
        setChecking(false);
      } catch (err) {
        console.error('[Onboarding] Failed to check memberships:', err);
        setChecking(false);
      }
    };

    checkMembership();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your company name.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          vat_number: vatNumber.trim(),
        }),
      });

      const json = (await res.json()) as { data: { companyId: string } | null; error: string | null };

      if (!res.ok || json.error) {
        setError(json.error ?? 'Could not set up your company. Please try again.');
        setLoading(false);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <p className="text-muted text-sm">
            Set up your company to start using GroundworkOS. If you are joining an
            existing company, ask your administrator to add you instead.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="company-name"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Company name *
            </label>
            <input
              id="company-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="e.g. Sharp Groundworks Ltd"
              required
            />
          </div>

          <div>
            <label
              htmlFor="company-email"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Company email
            </label>
            <input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="office@company.co.uk"
            />
          </div>

          <div>
            <label
              htmlFor="company-phone"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Phone
            </label>
            <input
              id="company-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="01234 567890"
            />
          </div>

          <div>
            <label
              htmlFor="company-address"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              Address
            </label>
            <input
              id="company-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="Unit 4, Trade Park, Reading RG1 2LP"
            />
          </div>

          <div>
            <label
              htmlFor="company-vat"
              className="block text-sm font-mono text-muted uppercase tracking-wide mb-2"
            >
              VAT number
            </label>
            <input
              id="company-vat"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded text-text placeholder:text-muted focus:outline-none focus:border-yellow transition-colors"
              placeholder="GB123456789"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" loading={loading}>
            Create company
          </Button>
        </form>
      </div>
    </div>
  );
}
