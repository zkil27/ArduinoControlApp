# Supabase Edge Functions - Deployment Script
# Usage: .\deploy-functions.ps1

Write-Host "🚀 Deploying Supabase Edge Functions..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

# Link to Supabase project (only needed once)
Write-Host "🔗 Linking to Supabase project..." -ForegroundColor Yellow
supabase link --project-ref your-project-ref

# Deploy all functions
Write-Host "📦 Deploying devices function..." -ForegroundColor Green
supabase functions deploy devices

Write-Host "📦 Deploying sensor-data function..." -ForegroundColor Green
supabase functions deploy sensor-data

Write-Host "📦 Deploying commands function..." -ForegroundColor Green
supabase functions deploy commands

Write-Host "✅ All functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Function URLs:" -ForegroundColor Cyan
Write-Host "   https://your-project-ref.supabase.co/functions/v1/devices"
Write-Host "   https://your-project-ref.supabase.co/functions/v1/sensor-data"
Write-Host "   https://your-project-ref.supabase.co/functions/v1/commands"
