# Supabase Setup Guide

## 1. Create Tables

1. Open SQL Editor: https://app.supabase.com/project/_/sql/new
2. Paste contents of `supabase/schema.sql`
3. Click **Run**
4. Verify tables in Table Editor: `devices`, `sensor_data`, `commands`

## 2. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

Add credentials from Project Settings → API:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Test Connection

```bash
cd frontend
npx tsx test-supabase.ts
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| Table not found | Run schema.sql (Step 1) |
| Missing env vars | Check `.env` file exists |
| RLS error on insert | Expected - auth required for writes |
