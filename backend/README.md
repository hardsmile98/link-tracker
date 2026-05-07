# Link Tracker Backend

Production-ready backend for ad traffic attribution and Telegram Mini App linking.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL
- Prisma ORM
- Zod validation
- Pino structured logging

## Project structure

```
.
├─ prisma/
│  └─ schema.prisma
├─ src/
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ logger.ts
│  │  └─ prisma.ts
│  ├─ controllers/
│  │  ├─ attribution.controller.ts
│  │  └─ click.controller.ts
│  ├─ middleware/
│  │  ├─ error-handler.ts
│  │  └─ request-logger.ts
│  ├─ routes/
│  │  ├─ attribution.routes.ts
│  │  └─ click.routes.ts
│  ├─ services/
│  │  ├─ attribution.service.ts
│  │  └─ click.service.ts
│  ├─ utils/
│  │  ├─ app-error.ts
│  │  └─ telegram.ts
│  ├─ app.ts
│  └─ server.ts
├─ .env.example
├─ package.json
└─ tsconfig.json
```

## API

### `GET /click`

- Accepts all query params (`utm_*`, `ttclid`, `fbclid`, and any custom params).
- Stores click in DB with headers (`user-agent`, `referer`, `ip`) and params JSON.
- Redirects with `302` to:
  `https://t.me/{TELEGRAM_BOT_USERNAME}/{TELEGRAM_MINI_APP_SHORT_NAME}?startapp={click_id}`

### `POST /attribution/link`

Body:

```json
{
  "click_id": "Ab3kL29xYz",
  "telegram_user_id": 123456789,
  "init_data": "query_id=...&user=...&hash=..."
}
```

- Verifies Telegram WebApp signature using HMAC SHA256.
- Validates that `telegram_user_id` in body matches Telegram `init_data.user.id`.
- Upserts attribution record to avoid duplicates.

### `GET /attribution/:telegram_user_id`

- Returns user attribution history with click metadata.

### Telegram message tracker (GramJS)

All endpoints below are protected by admin auth middleware.

### `GET /api/admin/telegram-trackers`

- Returns Telegram accounts configured for tracking.
- Includes `is_running` to show if listener is currently connected.

### `POST /api/admin/telegram-trackers`

Body:

```json
{
  "label": "Main support account",
  "api_id": 123456,
  "api_hash": "0123456789abcdef0123456789abcdef",
  "session_string": "1AAABBBCCC...",
  "is_active": true
}
```

- Creates Telegram tracked account and starts listener immediately if `is_active=true`.

### `POST /api/admin/telegram-trackers/auth/phone`

- Starts step-by-step Telegram auth.
- Sends login code to `phone_number`, returns `auth_session_id`.
- Uses `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from backend env.

### `POST /api/admin/telegram-trackers/auth/code`

- Verifies confirmation code using `auth_session_id`.
- Returns `next_step: "password"` if 2FA is enabled, otherwise creates tracker immediately.

### `POST /api/admin/telegram-trackers/auth/password`

- Finalizes login with Telegram 2FA password and creates tracker.

### `PATCH /api/admin/telegram-trackers/:id`

- Updates account credentials/activity state.
- Listener is restarted automatically to apply changes.

### `DELETE /api/admin/telegram-trackers/:id`

- Removes tracked account and stops listener.

### `GET /api/admin/telegram-trackers/:id/messages`

- Returns incoming messages for this tracked account.

## Setup

1. Copy env:

   `cp .env.example .env`

2. Generate Prisma client:

   `npm run prisma:generate`

3. Run migrations:

   `npm run prisma:migrate -- --name init`

4. Start dev:

   `npm run dev`

## Production

- Build: `npm run build`
- Start: `npm run start`
- Deploy migrations: `npm run prisma:deploy`
