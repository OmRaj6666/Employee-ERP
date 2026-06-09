# Employee Website

Local dev instructions:

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
node server.js
# or
npm start
```

3. Open http://127.0.0.1:3000 in your browser.

Security and auth
- The app now uses backend session authentication (HttpOnly cookie), not localStorage auth.
- Default local login credentials (for development):
	- username: `admin`
	- password: `raj`
- In production, set environment variables and do NOT use defaults:

```bash
export ADMIN_USER="admin"
export ADMIN_PASS="change_this_to_a_strong_secret"
```

Environment variables
- `PORT` default `3000`
- `HOST` default `127.0.0.1`
- `APP_ORIGIN` default `http://127.0.0.1:3000` (used for origin validation)
- `FORCE_HTTPS` set `true` to enforce HTTPS redirect behavior behind a TLS proxy
- `COOKIE_SECURE` set `true` in HTTPS production
- `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT` for Postgres connection

HTTPS/TLS
- Native HTTPS is supported when both certificate paths are provided:

```bash
export HTTPS_KEY_PATH="/absolute/path/to/key.pem"
export HTTPS_CERT_PATH="/absolute/path/to/cert.pem"
node server.js
```

- When these are set, the app serves over `https://...`.
- If not set, it runs HTTP locally and logs a TLS setup hint.

Notes:
- The reserve feature is client-side (localStorage). If you need server persistence, I can add API + DB changes.
- For automatic restarts during development, you can install `nodemon` and run `npx nodemon server.js`.
- Configure DB credentials via environment variables instead of editing code.

Database modes
- Postgres: If Postgres is available and the connection succeeds, the server will use Postgres and persist records to the `employees` table.
- In-memory fallback: If Postgres is not reachable, the server will automatically fall back to an in-memory store so the UI remains functional. This data is ephemeral and will be lost when the server restarts.

To use Postgres (recommended for persistence):
1. Ensure Postgres is running and set `PG*` environment variables.
2. Create the `employees` table (example SQL):

```sql
CREATE TABLE IF NOT EXISTS employees (
	emp_id SERIAL PRIMARY KEY,
	fname TEXT NOT NULL,
	lname TEXT NOT NULL,
	email TEXT,
	dept TEXT,
	salary NUMERIC,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

If you prefer me to add migrations or persist the "reserve" flag to the database, say so and I will implement it.
