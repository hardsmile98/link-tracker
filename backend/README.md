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
