import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, authConfigured } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';

type Mode = 'sign-in' | 'sign-up';

/** Only same-site paths, so ?redirect= can't send someone to another site. */
const safeRedirect = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined;

export const Route = createFileRoute('/sign-in/')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  component: SignInPage,
});

const STUDENT_EMAIL = /@(uwo|ivey)\.ca$/i;

function SignInPage() {
  const { redirect = '/listings' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once Neon has emailed a verification code; shows the code step. */
  const [checkInbox, setCheckInbox] = useState(false);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  async function finishSignIn() {
    const { error } = await authClient().signIn.email({ email: email.trim(), password });
    if (error) return setError(error.message ?? 'That email and password don’t match.');
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    navigate({ href: redirect });
  }

  async function sendCode() {
    const { error } = await authClient().emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: 'email-verification',
    });
    if (error) throw new Error(error.message ?? 'We couldn’t send a code. Try again.');
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const { error } = await authClient().emailOtp.verifyEmail({ email: email.trim(), otp: code.trim() });
      if (error) return setError(error.message ?? 'That code didn’t work. Check it and try again.');
      // Verified: sign in with the password they just typed so the API accepts their token.
      await finishSignIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      await sendCode();
      setNotice(`We sent a new code to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t send a code. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const auth = authClient();
      if (mode === 'sign-up') {
        const { error } = await auth.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          // Where the link in the verification email lands.
          callbackURL: `${window.location.origin}${redirect}`,
        });
        if (error) return setError(error.message ?? 'That didn’t work. Try again.');
        // Neon emails a verification code on sign-up. The API only accepts verified emails,
        // so sign out until they enter it.
        await auth.signOut().catch(() => {});
        setCode('');
        setCheckInbox(true);
        return;
      }

      const { error } = await auth.signIn.email({ email: email.trim(), password });
      if (error) {
        if (error.status === 403) {
          // Signed up but never verified: send a fresh code and ask for it.
          await sendCode();
          setCode('');
          setCheckInbox(true);
          return;
        }
        return setError(error.message ?? 'That email and password don’t match.');
      }
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate({ href: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={mode === 'sign-in' ? 'Sign in' : 'Create an account'}
        quiet="Western students and landlords"
        actions={
          <Segmented
            label="Sign in or create an account"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setCheckInbox(false);
              setNotice(null);
            }}
            options={[
              { value: 'sign-in', label: 'Sign in' },
              { value: 'sign-up', label: 'Create account' },
            ]}
            className="bg-white/70"
          />
        }
      >
        Students sign up with a @uwo.ca or @ivey.ca email to post sublets. Any other email gets a
        landlord account.
      </PageHeader>

      <div className="wrap max-w-lg pt-10 pb-24">
        {!authConfigured ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-wash px-4 py-3 font-text text-sm text-danger"
          >
            Sign-in isn’t set up on this copy of the app. Add VITE_NEON_AUTH_URL to client/.env (see
            client/.env.example) and restart the dev server.
          </p>
        ) : checkInbox ? (
          <form onSubmit={onVerify} className="flex flex-col gap-5">
            <div role="status" className="rounded-2xl bg-mint p-6 text-mint-ink">
              <h2 className="text-xl">Check your inbox</h2>
              <p className="mt-2 font-text">
                We sent a code to {email.trim()}. Enter it below to verify your email.
              </p>
            </div>
            <Field label="Verification code">
              {(a) => (
                <TextInput
                  {...a}
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                />
              )}
            </Field>
            {notice && <p role="status" className="font-text text-sm text-ink-soft">{notice}</p>}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-danger-wash px-4 py-3 font-text text-sm text-danger"
              >
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending || !code.trim()}>
              {pending ? 'One moment…' : 'Verify and sign in'}
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button type="button" color="ghost" disabled={pending} onClick={onResend}>
                Send a new code
              </Button>
              <Button
                type="button"
                color="ghost"
                disabled={pending}
                onClick={() => (setMode('sign-in'), setCheckInbox(false), setError(null), setNotice(null))}
              >
                Back to sign in
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {mode === 'sign-up' && (
              <Field label="Your name">
                {(a) => (
                  <TextInput
                    {...a}
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Field>
            )}
            <Field
              label="Email"
              hint={
                mode === 'sign-up' && email.includes('@')
                  ? STUDENT_EMAIL.test(email.trim())
                    ? 'You’ll get a student account.'
                    : 'Not a Western email, so you’ll get a landlord account.'
                  : undefined
              }
            >
              {(a) => (
                <TextInput
                  {...a}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Password"
              hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
            >
              {(a) => (
                <TextInput
                  {...a}
                  type="password"
                  name="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-danger-wash px-4 py-3 font-text text-sm text-danger"
              >
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? 'One moment…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
            <p className="font-text text-sm text-ink-soft">
              Just looking?{' '}
              <Link to="/listings" className="underline">
                Browse listings
              </Link>{' '}
              without an account.
            </p>
          </form>
        )}
      </div>
    </>
  );
}
