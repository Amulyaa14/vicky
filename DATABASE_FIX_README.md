# Database Error Fix Guide

## Error
`D1_ERROR: table users has no column named password_hash: SQLITE_ERROR`

## Problem
The Cloudflare Workers backend at `https://my-cloudflare-api.rpadmajaa-14.workers.dev` is trying to insert user registration data into a D1 database, but the `users` table is missing the `password_hash` column.

## Solution

### Step 1: Access Your Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Workers & Pages
3. Find your D1 database (likely named something related to your users/auth)

### Step 2: Run the Migration
Execute the SQL from `database-migration.sql` in your D1 database console:

```sql
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
```

### Step 3: Verify
After running the migration:
1. Try registering a new account at `/register`
2. The error should be resolved

## Alternative: Create Users Table
If the `users` table doesn't exist at all, use this schema:

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

## Running D1 Migrations via Wrangler CLI

If you have access to the Cloudflare Workers project locally:

```bash
# Navigate to your workers project directory
cd path/to/your/cloudflare-worker

# Run the migration
wrangler d1 execute YOUR_DATABASE_NAME --file=./path/to/database-migration.sql

# Or run directly
wrangler d1 execute YOUR_DATABASE_NAME --command="ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';"
```

## Backend Code Location
The backend API is hosted at: `https://my-cloudflare-api.rpadmajaa-14.workers.dev`

Relevant endpoints:
- `POST /api/auth/register` - User registration (currently failing)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

## Contact
If you don't have access to the Cloudflare Workers backend, contact the backend developer to run this migration.
