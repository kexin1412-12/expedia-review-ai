# Expedia Review AI Frontend

This version treats the provided hotel and review CSV files as backend data sources only.
The UI stays product-first:
- browse hotels
- open one hotel
- read guest reviews
- write a new review
- get one AI-generated follow-up while writing

## Run

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Add your OpenAI key to `.env.local` if you want live AI summaries and follow-up generation.
Without a key, the app uses a fallback follow-up.
