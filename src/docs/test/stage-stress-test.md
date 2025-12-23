# Stage environment setup for stress testing

## Goals

- Run API in `stage` environment (loads `.env.stage`).
- Skip all API rate limiting in `stage` (global + per-route).
- Run the `dozu-api-service` container with CPU/RAM caps for stress testing.
- Provide a practical approach for stage access tokens.

## 1) Stage env configuration

### What changed in code

The runtime env loader now supports 3 environments:

- `NODE_ENV=development`  loads `.env.development`
- `NODE_ENV=stage`  loads `.env.stage`
- `NODE_ENV=production`  loads `.env.production`

Also, `config.isStage` was added (similar to `config.isDevelopment` / `config.isProduction`).

### Required `.env.stage` minimum

Make sure at least these exist:

- `NODE_ENV=stage`
- `PORT=3555` (or the port you want)
- `HOST=localhost` (or `0.0.0.0` for Docker)
- `JWT_SECRET=...` (required to sign/verify tokens)

Tip for Docker: set `HOST=0.0.0.0` in `.env.stage` so the server binds correctly inside the container.

## 2) Skip rate limiting in stage

Rate limiting is disabled in stage by making the rate-limit middleware a no-op when `config.isStage` is true.

This covers:

- global limiter in the app (if enabled)
- route-level limiter like `/api/upload/*`

So you can run stress tests without getting `429 Too Many Requests` due to your own limiter.

## 3) Run a stage container with 2 CPU / 2GB RAM caps

### Why not use docker-compose limits?

In plain `docker compose` (non-swarm), `deploy.resources.limits` is commonly ignored.
So for stress testing with **hard caps**, use `docker run --cpus --memory`.

### Provided npm command

From the repo root:

- Build + run stage container with caps:

`npm run docker:stress:stage`

What it does:

- Builds an image using `.env.stage` baked into the image (`--build-arg ENV_FILE=.env.stage`)
- Runs the container with:
    - `--cpus=2`
    - `--memory=2g --memory-swap=2g`
    - `-e NODE_ENV=stage`
    - `-p 3555:3555`

If your stage port is not `3555`, update the port mapping in `package.json` script.

## 4) Stage access token approach (for multiple users)

### How tokens are created in this API

- `POST /api/auth/login` returns `accessToken` + `refreshToken`
- Most protected routes require `Authorization: Bearer <accessToken>`

Note: login only succeeds if the user is `isActive=true` and `isVerified=true`.

### Recommended options for stress tests

#### Option A (recommended): Seed verified stage users in DB

Create a few stage users directly in the stage DB with:

- `isVerified=true`
- `isActive=true`
- known usernames/passwords

Then your load tool can:

1. log in as each user to get an access token
2. reuse that token in subsequent requests

This avoids relying on email verification during load testing.

#### Option B: Use normal register  verify email  login

Flow:

1. `POST /api/auth/register`
2. `POST /api/auth/verify-email`
3. `POST /api/auth/login`

This requires your stage mail configuration to actually deliver the verification code/link.

### Example: login and use token

1. Login:

`POST http://localhost:3555/api/auth/login`

Body:

```json
{
    "username": "stage_user_01",
    "password": "your_password"
}
```

2. Use returned access token:

Header:
`Authorization: Bearer <accessToken>`

Example protected endpoint:
`GET http://localhost:3555/api/auth/profile`

## 5) Quick k6 pattern (multiple users)

Suggested pattern:

- Pre-create N users in stage DB (Option A)
- In k6 `setup()`: login N users and return an array of tokens
- In VU execution: pick a token by VU id

(Exact k6 script depends on which endpoints you want to stress.)
