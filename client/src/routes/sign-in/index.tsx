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
  const [checkInbox, setCheckInbox] = useState(false);

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
        // The API only accepts verified emails, so there's nothing to do until they click the link.
        await auth.signOut().catch(() => {});
        setCheckInbox(true);
        return;
      }

      const { error } = await auth.signIn.email({ email: email.trim(), password });
      if (error) {
        return setError(
          error.status === 403
            ? 'Verify your email first: check your inbox for the link we sent.'
            : (error.message ?? 'That email and password don’t match.'),
        );
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
          <div role="status" className="rounded-2xl bg-mint p-6 text-mint-ink">
            <h2 className="text-xl">Check your inbox</h2>
            <p className="mt-2 font-text">
              We sent a link to {email}. Open it to verify your email, then sign in.
            </p>
            <Button
              className="mt-4"
              color="white"
              onClick={() => (setMode('sign-in'), setCheckInbox(false))}
            >
              Back to sign in
            </Button>
          </div>
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
