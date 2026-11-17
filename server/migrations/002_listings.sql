-- Leases and sublets share one table; a sublet is a listing with kind = 'sublet'.
-- Columns mirror ListingSchema in client/src/data/data.ts (snake_case here, camelCase in the API).
CREATE TABLE listings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               TEXT NOT NULL CHECK (kind IN ('lease', 'sublet')),
  type               TEXT NOT NULL CHECK (type IN ('house', 'apartment', 'townhouse', 'room')),
  name               TEXT NOT NULL,
  description        TEXT NOT NULL,
  price              INT  NOT NULL CHECK (price >= 0),          -- dollars per month, per room
  lease              INT  NOT NULL CHECK (lease > 0),           -- length in months
  address            TEXT NOT NULL,                             -- street and district, no house number
  neighbourhood      TEXT NOT NULL CHECK (neighbourhood IN (
                       'Broughdale', 'Old North', 'University Heights', 'Cherryhill',
                       'Downtown', 'Oxford Park', 'Masonville')),
  beds               INT  NOT NULL CHECK (beds >= 0),
  baths              NUMERIC(3, 1) NOT NULL CHECK (baths >= 0),
  rooms_open         INT  NOT NULL CHECK (rooms_open >= 0),
  walk_minutes       INT  NOT NULL CHECK (walk_minutes >= 0),
  bus_minutes        INT  NOT NULL CHECK (bus_minutes >= 0),
  grocery_minutes    INT  NOT NULL CHECK (grocery_minutes >= 0),
  available_from     DATE NOT NULL,
  available_to       DATE,
  furnished          BOOLEAN NOT NULL DEFAULT false,
  utilities_included BOOLEAN NOT NULL DEFAULT false,
  amenities          TEXT[] NOT NULL DEFAULT '{}',
  photos             JSONB NOT NULL,
  western_verified   BOOLEAN NOT NULL DEFAULT false,
  posted_by          UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  landlord_id        UUID,                                      -- FK added once the landlords table exists
  posted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sublet_has_end_date CHECK (
    kind <> 'sublet' OR (available_to IS NOT NULL AND available_to > available_from)
  )
);

CREATE INDEX listings_kind_dates_idx ON listings (kind, available_from, available_to);
CREATE INDEX listings_posted_by_idx ON listings (posted_by);
CREATE INDEX listings_posted_at_idx ON listings (posted_at DESC);
