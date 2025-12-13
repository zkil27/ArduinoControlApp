# Supabase Setup Guide - Step by Step

## ✅ Step 1: Verify Your Supabase Project

You already have credentials, so your project exists! Let's verify it:

**Your Project:**
- URL: `https://rziqggjazwhwtgbikkcf.supabase.co`
- Project ID: `rziqggjazwhwtgbikkcf`

Go to: https://app.supabase.com/project/rziqggjazwhwtgbikkcf

You should see your project dashboard.

---

## 📊 Step 2: Create Database Tables

### 2.1 Open SQL Editor
1. Go to: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/sql/new
2. You'll see a blank SQL editor

### 2.2 Copy the Schema
1. Open this file: `supabase/schema.sql` (in your project)
2. Select ALL the content (Ctrl+A)
3. Copy it (Ctrl+C)

### 2.3 Run the Schema
1. Paste into Supabase SQL Editor (Ctrl+V)
2. Click **"Run"** button (bottom right corner)
3. Wait for green success message: ✅ "Success. No rows returned"

### 2.4 Verify Tables Were Created
1. Go to Table Editor: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/editor
2. You should see 3 tables in the left sidebar:
   - ✅ **devices**
   - ✅ **sensor_data**
   - ✅ **commands**

---

## 🔐 Step 3: Configure Row Level Security (RLS)

Your tables now have RLS enabled. This means:
- Users can only see their own devices
- No one can access another user's data
- This is **already configured** by the schema!

To verify RLS is active:
1. Go to: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/auth/policies
2. You should see policies for `devices`, `sensor_data`, and `commands`

---

## 🧪 Step 4: Test the Connection

Run the test script from your project:

```bash
cd frontend
npx tsx test-supabase.ts
```

### Expected Output:
```
🧪 Testing Supabase Connection...
✅ Supabase client initialized
📡 Testing database connection...
✅ Database connection successful!
🔨 Testing insert operation...
⚠️  Insert blocked by Row Level Security (expected!)
🔄 Testing real-time subscriptions...
✅ Real-time subscriptions working!
🎉 All tests passed!
```

---

## 🎯 Step 5: (Optional) Add Test Data

Want to test with some data? Go to Table Editor:

1. Go to: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/editor/devices
2. Click **"Insert row"** button
3. Fill in:
   - `name`: "Test Arduino"
   - `type`: "arduino_uno"
   - `mac_address`: "00:11:22:33:44:55"
   - `is_online`: false
   - Leave other fields as default
4. Click **"Save"**

---

## 🔑 Step 6: Enable Authentication (Optional)

If you want users to sign up/login:

1. Go to Authentication: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/auth/users
2. Click **"Add user"** to create a test user
3. Or enable email auth: https://app.supabase.com/project/rziqggjazwhwtgbikkcf/auth/providers

For now, you can test without auth (RLS will just block writes).

---

## 🚀 Next Steps

Once all tests pass, you're ready to:

1. **Start building your app:**
   ```bash
   cd frontend
   npm start
   ```

2. **Use the hooks in your components:**
   ```tsx
   import { useDevices } from '@/hooks/use-devices';
   
   function MyComponent() {
     const { devices, loading } = useDevices();
     // Your UI here
   }
   ```

3. **Check examples:**
   - See `frontend/SUPABASE.md` for usage examples

---

## 🆘 Troubleshooting

### "Could not find the table 'public.devices'"
- ❌ You haven't run the schema yet
- ✅ Go back to Step 2

### "Missing environment variables"
- ❌ `.env` file not loaded
- ✅ Make sure `frontend/.env` exists with correct credentials

### "Row Level Security" error when inserting
- ✅ This is **expected**! RLS is working correctly
- Users need to be authenticated to insert data
- For testing without auth, you can temporarily disable RLS

### Test keeps failing
- Check your internet connection
- Verify project URL is correct in `.env`
- Try opening Supabase dashboard to confirm project is active

---

## 📚 Useful Links

- **Your Project Dashboard:** https://app.supabase.com/project/rziqggjazwhwtgbikkcf
- **Table Editor:** https://app.supabase.com/project/rziqggjazwhwtgbikkcf/editor
- **SQL Editor:** https://app.supabase.com/project/rziqggjazwhwtgbikkcf/sql
- **API Settings:** https://app.supabase.com/project/rziqggjazwhwtgbikkcf/settings/api
- **Supabase Docs:** https://supabase.com/docs
