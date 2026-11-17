-- App-specific data for each Neon Auth user. Accounts themselves live in
-- neon_auth."user" (managed by Neon Auth; don't alter it).
CREATE TABLE profiles (
  user_id    UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('student', 'landlord', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
