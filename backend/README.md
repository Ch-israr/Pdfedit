# pdfedit backend

Python serverless API for the pdfedit web app, deployed as its own Vercel
project (separate from the Expo frontend). Four tools, guest mode, optional
accounts, per-tool hourly limits, and a Premium plan flag.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/process?tool=<slug>` | optional | Process PDF(s); returns the result file directly |
| GET | `/api/usage?tool=<slug>` | optional | Remaining free uses for one tool |
| POST | `/api/auth?action=register` | — | Create account `{email, password, name?}` |
| POST | `/api/auth?action=login` | — | Sign in `{email, password}` |
| GET | `/api/auth?action=me` | Bearer JWT | Current account |
| GET | `/api/health` | — | Liveness probe |

Tools: `merge-pdf`, `split-pdf`, `compress-pdf`, `pdf-to-word`.

Guest identity = SHA-256(IP + `X-Guest-Id` header). Authenticated users are
identified by their verified JWT (`Authorization: Bearer`), never by a
client-supplied id. The plan (`free`/`premium`) always comes from the database.

## Limits

Free: 5 successful uses per tool per rolling 1-hour window, enforced
server-side. Counters increment only after successful processing; failures
return 4xx and never consume allowance. Premium: unlimited.

## Environment variables (Vercel → project → Settings → Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | yes | Random 32+ byte string for JWT signing |
| `SUPABASE_URL` | for accounts/limits | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | for accounts/limits | Supabase **service-role** key (server-side only, never in the repo) |
| `UPSTASH_REDIS_REST_URL` | no | Optional fast counter cache |
| `UPSTASH_REDIS_REST_TOKEN` | no | Optional fast counter cache |
| `ALLOWED_ORIGINS` | no | CORS origins, default `*` |
| `MAX_FILE_MB` | no | Max upload size, default `4` (Vercel request limit) |

Without Supabase configured: PDF processing still works for everyone, but
`/api/auth/*` returns 503 and `/api/usage` reports `enforced: false`.

## Database setup (one time)

1. Create a free project at supabase.com.
2. In the Supabase SQL editor, run `schema.sql` from this folder.
3. Copy the project URL and **service-role** key into the Vercel env vars above.
4. Redeploy.

To grant Premium manually (no payment gateway yet):
```sql
update users set plan = 'premium' where email = 'someone@example.com';
```

## Local development

```bash
pip install -r requirements.txt
SECRET_KEY=dev-secret-please-change python -m http.server  # not for prod
```

The handlers are plain `BaseHTTPRequestHandler` subclasses (Vercel Python
runtime); each file in `api/` becomes one serverless function.

## Notes

- Vercel serverless requests cap at ~4.5 MB, so `MAX_FILE_MB` defaults to 4.
  For larger files later: upload directly to Supabase Storage, then process by URL.
- `pdf2docx`/`Pillow` are imported lazily inside their tool functions so the
  other endpoints stay fast on cold start.
- Google Drive is intentionally not wired in v1: results stream back in the
  response and metadata lands in Postgres. Drive can be added later for
  async/large-file flows without touching the tools.
