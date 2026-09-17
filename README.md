# PairVoice

PairVoice connects eligible contributors with paid paired-conversation voice opportunities.

## Current landing campaigns
- United States English: $60 total per approved pair
- Spain Spanish: $50 total per approved pair

## Run
Requires Node.js 20+.

```bash
npm test
npm run check
npm start
```

Open `/us` or `/es`.

## API
- `GET /api/health`
- `GET /api/campaigns`
- `POST /api/eligibility`
- `POST /api/participants`
- `POST /api/pairs`
- `POST /api/pairs/join/:token`
- `POST /api/events`

## Production boundary
The tested MVP currently uses an in-memory repository. Before accepting real participant data, replace it with durable production storage, authentication, rate limiting, verified email/phone delivery, final privacy/consent documents, and secret management. Do not deploy the in-memory participant store as the final production data layer.
