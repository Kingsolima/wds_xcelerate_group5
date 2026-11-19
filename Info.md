# House Finding App

Housing app for Western (UWO) students: listings, reviews, sublets and roommate matching.

## Features

- See comments and ratings on residences and landlords.
- Find sublets, and post sublet listings when away on internship or for the summer.
- Scroll through listings and find other interested roommates.
  - Match with them.
- See the features of each listing.
  - Examples: close to campus, Western verified, near a Superstore.

## Stack

TypeScript across the whole stack.

| Layer    | Tech                     |
| -------- | ------------------------ |
| Frontend | React (TypeScript, Vite) |
| Backend  | Express.js (TypeScript)  |
| Database | PostgreSQL (Neon, AWS us-east-1) |
| Hosting  | AWS                      |

## Function Splitting

| Person  | Area                               |
| ------- | ---------------------------------- |
| Omar    | Auth, Sublets                      |
| Sam     | Landlord posting, UWO verification |
| Lavanya | UX / design                        |
| Tanya   | Join a group / party               |
| Jeffrey | Frontend                           |

## User Stories (Western students only)

**Student looking for good listings**
As a Western student, I want to read comments and reviews on a landlord or listing, so that I know beforehand whether a listing is bad.

**Student posting a sublet**
As a student on a gap semester or internship, I want to post my room for subletting, so that I don't pay full rent for a place I'm not living in.

**Student finding a sublet**
As a student coming to London for a summer or one term, I want to search sublets by date range, so that I only see places available when I need them.

**Landlord posting a listing**
As a landlord, I want to post a listing for students, so that students can find it. If it's scraped from Western's off-campus housing page, it's marked Western verified.

**Student leaving a review**
As a student who has lived somewhere, I want to rate and review the listing and landlord, so that other students can make a better choice.

**Student finding roommates**
As a student without a full group, I want to see who else is interested in a listing, so that I can find roommates to rent it with.

**Student matching with roommates**
As a student, I want to match with another student who liked the same listing, so that we can message and plan to rent together.

**Student joining a group**
As a student, I want to create or join a group for a listing, so that my roommates and I can apply together.

**Student filtering listings**
As a student, I want to filter listings by price, distance to campus, nearby stores and Western verified, so that I only see places that fit me.

**Western-only sign-up**
As a student, I want to sign up with my @uwo.ca or @ivey.ca email, so that everyone on the app is a real Western student.

## API Endpoints

All routes are prefixed with `/api`. Routes marked **Signed in:** need an `Authorization: Bearer <Neon Auth JWT>` header from a user with a verified email. Without it they return 401 (or 403 if the email isn't verified).

### Auth

Sign-up, sign-in (email + password or magic link), email verification and sign-out are handled by **Neon Auth** in the browser, not by Express.

| Method | Route      | Purpose                                   |
| ------ | ---------- | ----------------------------------------- |
| GET    | `/auth/me` | Signed in: Get the current user (id, email, name, role) |

- Roles: a verified `@uwo.ca` or `@ivey.ca` email = `student`, any other email = `landlord`. `admin` is set by hand in the `profiles` table.
- Backend usage: `router.post('/listings', auth, requireRole('landlord'), handler)` with `auth` and `requireRole` from `server/src/auth/index.ts`.

**Frontend:**
- `client/src/lib/auth.ts` sets up `@neon/auth` from `VITE_NEON_AUTH_URL` in `client/.env` (see `client/.env.example`).
- `/sign-in` signs in or creates an account with email + password. New accounts get a verification email, and the API rejects them until it's clicked.
- `client/src/data/http.ts` calls `/api/...` and adds `Authorization: Bearer <JWT>` for signed-in routes. The JWT comes from Neon's `getJWTToken()`, not `getSession().session.token` (that one is a session id, not a JWT).
- The nav and the post page read the role from `GET /api/auth/me`. Sublets need a student account and leases need a landlord account.
- Listings come from the API, and the seed listings in `client/src/data/listings.ts` are shown after them. Reviews, landlords and roommate posts are still local mock data in `client/src/data/api.ts` until their endpoints exist.

**Running it locally:** fill in `server/.env` and `client/.env`, run `npm run migrate -w server` once, then `npm run dev` from the repo root (Express on 3001, Vite on 5173, `/api` proxied).

### Listings

Leases and sublets share one `listings` table and these routes. A sublet is a listing with `kind: 'sublet'`. The response shape matches `ListingRecord` in `client/src/data/data.ts`.

| Method | Route           | Purpose |
| ------ | --------------- | ------- |
| GET    | `/listings`     | Search. Filters: `kind`, `type`, `neighbourhood`, `minPrice`, `maxPrice`, `furnished`, `from`/`to` (available for the whole period), `limit` (max 50), `offset`. Ended sublets are hidden. |
| GET    | `/listings/:id` | Get one listing |
| POST   | `/listings`     | Signed in: Sublets: students only, max 3 active. Leases: landlords/admins. |
| PATCH  | `/listings/:id` | Signed in: Poster or admin. Can't change `kind` or `westernVerified`. |
| DELETE | `/listings/:id` | Signed in: Poster or admin |
| GET    | `/me/listings`  | Signed in: Everything I've posted, including ended sublets |

- Sublets need `availableTo` after `availableFrom`. Leases have no end date.
- `westernVerified` is always false when posted. Only the Western scrape sets it (Sam).
- `landlordId` is the poster for leases and null for sublets. Sam: add the foreign key once the landlords table exists.
- Ratings (`rating`, `reviewCount`) will be added with the reviews endpoints.

### Reviews

| Method | Route                   | Purpose                               |
| ------ | ----------------------- | ------------------------------------- |
| GET    | `/listings/:id/reviews` | Get reviews and ratings for a listing |
| POST   | `/listings/:id/reviews` | Signed in: Post a review and rating           |
| DELETE | `/reviews/:id`          | Signed in: Author deletes their review        |

### Roommates & Matching

| Method | Route                      | Purpose                             |
| ------ | -------------------------- | ----------------------------------- |
| POST   | `/listings/:id/interest`   | Signed in: Mark interest in a listing       |
| DELETE | `/listings/:id/interest`   | Signed in: Remove interest                  |
| GET    | `/listings/:id/interested` | Signed in: See other students interested    |
| POST   | `/matches`                 | Signed in: Like a student (match if mutual) |
| GET    | `/matches`                 | Signed in: Get my matches                   |

### Groups

| Method | Route               | Purpose                         |
| ------ | ------------------- | ------------------------------- |
| POST   | `/groups`           | Signed in: Create a group for a listing |
| GET    | `/groups/:id`       | Signed in: Get a group and its members  |
| POST   | `/groups/:id/join`  | Signed in: Join a group                 |
| POST   | `/groups/:id/leave` | Signed in: Leave a group                |

### Verification

| Method | Route                  | Purpose                                                     |
| ------ | ---------------------- | ----------------------------------------------------------- |
| POST   | `/verification/scrape` | Signed in, admin only: pull Western's off-campus listings, mark verified |
