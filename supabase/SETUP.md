# Supabase CLI Installation and Setup Guide

## Install Supabase CLI

### Windows (PowerShell)
```powershell
npm install -g supabase
```

### Mac/Linux
```bash
npm install -g supabase
# OR
brew install supabase/tap/supabase
```

## Setup

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   
   Find your project ref in: https://app.supabase.com/project/_/settings/general

3. **Set Environment Variables**
   
   Your functions need these secrets:
   ```bash
   supabase secrets set SUPABASE_URL=your-url
   supabase secrets set SUPABASE_ANON_KEY=your-anon-key
   ```

## Local Development

Start local Supabase (includes Edge Functions):
```bash
supabase start
```

Serve functions locally:
```bash
supabase functions serve
```

Test locally:
```bash
curl -i --location --request GET 'http://localhost:54321/functions/v1/devices' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```

## Deploy Functions

Deploy all:
```bash
supabase functions deploy devices
supabase functions deploy sensor-data
supabase functions deploy commands
```

Or use the script:
```bash
.\deploy-functions.ps1
```

## Function URLs

After deployment, your functions are available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/devices
https://YOUR_PROJECT_REF.supabase.co/functions/v1/sensor-data
https://YOUR_PROJECT_REF.supabase.co/functions/v1/commands
```

## Monitoring

View logs:
```bash
supabase functions logs devices
supabase functions logs sensor-data
supabase functions logs commands
```

## Troubleshooting

Check function status:
```bash
supabase functions list
```

Delete and redeploy:
```bash
supabase functions delete devices
supabase functions deploy devices
```
