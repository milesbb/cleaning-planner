# Accept an invite — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Accept an invite (`/join?code=`, from a link or a typed code). Signed out, it keeps the code (`lib/invites/pending-invite.ts`) and `/` brings the person back after sign-up or log in. Signed in, it previews the home and joins; someone already living there goes straight to `/today`; an unknown or expired code is forgotten and offers to type another.
