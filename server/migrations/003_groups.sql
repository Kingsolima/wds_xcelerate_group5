
-- Roommate groups linked to housing listings.
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL
        REFERENCES listings(id) ON DELETE CASCADE,
    created_by UUID NOT NULL
        REFERENCES profiles(user_id),
    capacity INT NOT NULL CHECK (capacity >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students who belong to each roommate group.
CREATE TABLE group_members (
    group_id UUID NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES profiles(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX groups_listing_id_idx
    ON groups(listing_id);

CREATE INDEX group_members_user_id_idx
    ON group_members(user_id);
