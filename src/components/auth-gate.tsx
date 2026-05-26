'use client';

import { Loader2, LockKeyhole } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MittyLogo } from '@/components/mitty-logo';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'owner' | 'staff';

export type AuthContextValue = {
  user: User;
  email: string;
  role: AppRole;
  logout: () => Promise<void>;
};

const OWNER_USER_ID = 'a35c12a0-4d29-43d3-9dd1-1e83cf733452';
const OWNER_EMAIL = 'admin@gpbm.in';

const getFallbackRole = (user: User): AppRole => {
  const email = user.email?.toLowerCase();
  return user.id === OWNER_USER_ID || email === OWNER_EMAIL ? 'owner' : 'staff';
};

const resolveRole = async (user: User): Promise<AppRole> => {
  const fallbackRole = getFallbackRole(user);

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data?.role) {
      return fallbackRole;
    }

    return data.role === 'owner' || fallbackRole === 'owner' ? 'owner' : 'staff';
  } catch {
    return fallbackRole;
  }
};

type AuthGateProps = {
  children: (auth: AuthContextValue) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [auth, setAuth] = useState<AuthContextValue | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const { toast } = useToast();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    const buildAuthContext = async (user: User): Promise<AuthContextValue> => ({
      user,
      email: user.email || '',
      role: await resolveRole(user),
      logout: async () => {
        await supabase.auth.signOut();
      },
    });

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setAuth(await buildAuthContext(data.session.user));
      }
      setCheckingSession(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setAuth(null);
        setCheckingSession(false);
        return;
      }

      void buildAuthContext(session.user).then(setAuth).finally(() => setCheckingSession(false));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Check the email and password for an existing Mitty account.',
      });
    }

    setLoggingIn(false);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf7f0] text-[#171717]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!auth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(183,141,74,0.16),_transparent_32rem),linear-gradient(180deg,_#faf7f0_0%,_#f4efe6_100%)] p-4">
        <Card className="w-full max-w-md border-black/10 bg-white/90 shadow-xl backdrop-blur">
          <CardContent className="p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <MittyLogo className="h-12 w-12" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8a6635]">MITTY</p>
                <h1 className="text-2xl font-semibold text-[#171717]">Studio Login</h1>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3 rounded-lg border border-black/10 bg-[#171717] p-4 text-white">
              <LockKeyhole className="h-5 w-5 text-[#f4d99f]" />
              <p className="text-sm text-white/75">Existing Supabase Auth users only.</p>
            </div>

            <form onSubmit={handleLogin} className="mt-7 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loggingIn} className="mt-2 h-11 bg-[#171717] text-white hover:bg-[#2a2a2a]">
                {loggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children(auth)}</>;
}
