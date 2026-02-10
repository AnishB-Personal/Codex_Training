import crypto from 'node:crypto';
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { Issuer, generators } from 'openid-client';

dotenv.config();

const {
  PORT = 3000,
  SESSION_SECRET = 'replace-me-in-production',
  ISSUER_URL,
  CLIENT_ID,
  CLIENT_SECRET = '',
  REDIRECT_URI = 'http://localhost:3000/callback'
} = process.env;

if (!ISSUER_URL || !CLIENT_ID) {
  console.error('Missing required env vars: ISSUER_URL, CLIENT_ID');
  process.exit(1);
}

const app = express();

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60
    }
  })
);

let oidcClient;
let discoveredIssuer;

async function initializeClient() {
  discoveredIssuer = await Issuer.discover(ISSUER_URL);
  const clientConfig = {
    client_id: CLIENT_ID,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code']
  };

  if (CLIENT_SECRET) {
    clientConfig.client_secret = CLIENT_SECRET;
  }

  oidcClient = new discoveredIssuer.Client(clientConfig);
}


app.get('/', (req, res) => {
  const user = req.session.user;

  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SSO Authentication PoC</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1rem; }
      code, pre { background: #f4f4f4; border-radius: 4px; }
      code { padding: 0.1rem 0.3rem; }
      pre { padding: 0.8rem; overflow: auto; }
      .btn { display:inline-block; padding: 0.55rem 0.9rem; text-decoration:none; border-radius:6px; margin-right:0.5rem; }
      .btn-primary { background:#0d6efd; color:#fff; }
      .btn-danger { background:#c1121f; color:#fff; }
    </style>
  </head>
  <body>
    <h1>OIDC SSO Proof of Concept</h1>
    <div class="card">
      <p>Status: <strong>${user ? 'Authenticated' : 'Not Authenticated'}</strong></p>
      ${
        user
          ? `<a class="btn btn-danger" href="/logout">Logout</a>`
          : `<a class="btn btn-primary" href="/login">Login with SSO</a>`
      }
    </div>

    ${
      user
        ? `<div class="card">
            <h2>Authenticated user claims</h2>
            <pre>${JSON.stringify(user, null, 2)}</pre>
          </div>`
        : `<div class="card">
            <h2>How this PoC works</h2>
            <ol>
              <li>User clicks <code>Login with SSO</code>.</li>
              <li>App redirects to your OIDC provider (Okta/Auth0/Azure AD/Keycloak).</li>
              <li>Provider returns an auth code to <code>${REDIRECT_URI}</code>.</li>
              <li>App exchanges code for tokens and stores user claims in the session.</li>
            </ol>
          </div>`
    }
  </body>
</html>`);
});


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/login', async (req, res, next) => {
  try {
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    req.session.state = state;
    req.session.nonce = nonce;
    req.session.codeVerifier = codeVerifier;

    const authUrl = oidcClient.authorizationUrl({
      scope: 'openid profile email',
      response_mode: 'query',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

app.get('/callback', async (req, res, next) => {
  try {
    const params = oidcClient.callbackParams(req);
    const tokenSet = await oidcClient.callback(
      REDIRECT_URI,
      params,
      {
        state: req.session.state,
        nonce: req.session.nonce,
        code_verifier: req.session.codeVerifier
      }
    );

    const userInfo = await oidcClient.userinfo(tokenSet.access_token);

    req.session.user = {
      ...tokenSet.claims(),
      ...userInfo,
      id_token: tokenSet.id_token
    };

    delete req.session.state;
    delete req.session.nonce;
    delete req.session.codeVerifier;

    res.redirect('/');
  } catch (error) {
    next(error);
  }
});

app.get('/logout', (req, res) => {
  const idToken = req.session?.user?.id_token;
  req.session.destroy(() => {
    if (discoveredIssuer?.metadata?.end_session_endpoint && idToken) {
      const url = new URL(discoveredIssuer.metadata.end_session_endpoint);
      url.searchParams.set('id_token_hint', idToken);
      url.searchParams.set('post_logout_redirect_uri', `http://localhost:${PORT}`);
      return res.redirect(url.toString());
    }

    res.redirect('/');
  });
});

app.use((error, req, res, next) => {
  const correlationId = crypto.randomUUID();
  console.error(`[${correlationId}]`, error);
  res.status(500).send(`
    <h1>Authentication error</h1>
    <p>Correlation ID: <code>${correlationId}</code></p>
    <pre>${error.message}</pre>
    <a href="/">Back</a>
  `);
});

initializeClient()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SSO PoC running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize OIDC client:', error);
    process.exit(1);
  });
