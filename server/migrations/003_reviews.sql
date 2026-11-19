-- Student reviews of a listing. Mirrors ReviewSchema in client/src/data/data.ts.
-- Landlord reviews will come later, once the landlords table exists.
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  author_detail   TEXT NOT NULL,                              -- e.g. "3rd-year Kinesiology"
  lived_there     TEXT NOT NULL,                              -- e.g. "2025–26"
  rating          INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  score_landlord  INT  NOT NULL CHECK (score_landlord BETWEEN 1 AND 5),
  score_condition INT  NOT NULL CHECK (score_condition BETWEEN 1 AND 5),
  score_value     INT  NOT NULL CHECK (score_value BETWEEN 1 AND 5),
  score_quiet     INT  NOT NULL CHECK (score_quiet BETWEEN 1 AND 5),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One review per student per listing.
  CONSTRAINT reviews_one_per_author UNIQUE (listing_id, author_id)
);

CREATE INDEX reviews_listing_idx ON reviews (listing_id, created_at DESC);
CREATE INDEX reviews_author_idx ON reviews (author_id);
