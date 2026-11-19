-- Turns a roommate group into the post shown on the Roommates board.
-- Columns mirror RoommatePostSchema in client/src/data/data.ts (snake_case here, camelCase in the API).
-- Defaults only exist so rows made before this migration stay valid; the API always sets every field.

-- Most roommate posts aren't about one listing.
ALTER TABLE groups ALTER COLUMN listing_id DROP NOT NULL;

ALTER TABLE groups
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'group'
    CHECK (kind IN ('have-place', 'need-place', 'group')),
  ADD COLUMN title TEXT NOT NULL DEFAULT '',
  ADD COLUMN body TEXT NOT NULL DEFAULT '',
  ADD COLUMN author_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN author_detail TEXT NOT NULL DEFAULT '',
  -- People already in who aren't on the app (the poster's friends). They take up spots.
  ADD COLUMN offline_members INT NOT NULL DEFAULT 0 CHECK (offline_members >= 0),
  ADD COLUMN budget INT NOT NULL DEFAULT 0 CHECK (budget >= 0),   -- dollars per person, per month
  ADD COLUMN move_in DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN months INT NOT NULL DEFAULT 12 CHECK (months > 0),   -- lease length
  ADD COLUMN neighbourhoods TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

-- The creator plus their offline friends can't already fill the group.
ALTER TABLE groups
  ADD CONSTRAINT groups_offline_fit CHECK (offline_members < capacity);

CREATE INDEX groups_created_at_idx ON groups (created_at DESC);
