# SSO Authentication PoC (OIDC)

This project is a proof of concept (PoC) for Single Sign-On (SSO) authentication using OpenID Connect (OIDC).

## Features

- Authorization Code Flow + PKCE.
- Session-based login state.
- `/login`, `/callback`, and `/logout` endpoints.
- Displays authenticated user claims on the home page.
- Works with providers like Okta, Auth0, Keycloak, Azure AD, and others exposing OIDC discovery metadata.

## Prerequisites

- Node.js 18+
- OIDC client application configured in your identity provider:
  - Redirect URI: `http://localhost:3000/callback`
  - Grant type: Authorization Code

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy and edit env vars:

   ```bash
   cp .env.example .env
   ```

3. Set these values in `.env`:

   - `ISSUER_URL` (discovery endpoint URL)
   - `CLIENT_ID`
   - `CLIENT_SECRET` (optional for public clients)
   - `SESSION_SECRET`

## Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) and click **Login with SSO**.

## Endpoints

- `GET /` : Home screen and login status.
- `GET /health` : Health check endpoint.
- `GET /login` : Starts OIDC authorization.
- `GET /callback` : OIDC redirect URI.
- `GET /logout` : Clears local session and attempts provider logout.

## Notes

- This is a demo PoC, not production hardened.
- For production:
  - Use HTTPS.
  - Secure session storage (Redis/database).
  - Harden cookie settings (`secure: true`, strict `sameSite` as needed).
  - Add CSRF protections and structured logging.
