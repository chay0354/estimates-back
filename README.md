# estimates-back

Express API for the estimate pipeline. Data lives in Supabase.

## Local

```bash
cp .env.example .env
npm install
npm run dev
```

API: [http://localhost:4000/api](http://localhost:4000/api)

## Vercel

1. Import [this repo](https://github.com/chay0354/estimates-back) into Vercel. Framework should be **Express**.
2. Set these environment variables (Production + Preview):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://dtohzhckrsvdgvmdbxru.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key from Supabase |
| `SUPABASE_JWKS_URL` | `https://dtohzhckrsvdgvmdbxru.supabase.co/auth/v1/.well-known/jwks.json` |
| `CORS_ORIGIN` | `https://estimates-front.vercel.app` (add a custom frontend domain later, comma-separated) |
| `NODE_ENV` | `production` |

3. Deploy. Health check: `https://<this-project>.vercel.app/api/health`

Preview URLs for `estimates-front` on `*.vercel.app` are allowed automatically.
