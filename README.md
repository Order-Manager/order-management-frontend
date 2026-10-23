# Order management system

Node version: 20.15.0

## Environments

| | Firebase project | Site | Vite mode |
|---|---|---|---|
| prod | `orders-server` | ift.devinci.fr/orders | `production` |
| dev | `orders-server-dev` | orders.thomasjuldo.com/orders | `development` |

The Firebase web config lives in `.env.production` and `.env.development`. `npm run dev` uses the dev project.

## Running

```bash
npm run dev
```

## Building the Docker image

```bash
docker build -t orders .                                      # prod
docker build --build-arg BUILD_MODE=development -t orders .   # dev
```

## Firestore rules

Rules tests run on the Firestore emulator (needs Java):

```bash
npm run test:rules
```

Deploy rules and indexes (`default` alias is dev):

```bash
firebase deploy --only firestore -P dev
firebase deploy --only firestore -P prod
```

Without a working Firebase CLI login, `node scripts/deploy-rules.mjs <projectId>` does the same with your gcloud login.

Seed the dev project (suppliers, tags, admins):

```bash
node scripts/seed-dev.mjs you@devinci.fr
```

## Updating the firebase cloud functions

Email links point to `APP_URL` from `functions/.env.<projectId>`.

```bash
firebase deploy --only functions -P dev
```
