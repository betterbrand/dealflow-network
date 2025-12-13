# Environment Variables Setup Guide for Vercel

## Important: No Docker Needed

**Vercel handles deployment differently than traditional hosting:**
- You don't need Docker
- You don't need to install Vercel CLI in a container
- Vercel builds and deploys directly from your GitHub repository
- Everything happens in Vercel's cloud infrastructure

**The deployment process:**
1. You connect your GitHub repo to Vercel (via web UI)
2. You add environment variables in Vercel's dashboard
3. Vercel automatically builds and deploys your app
4. Done - your app is live

---

## Environment Variables Walkthrough

Here's every environment variable you need, explained step-by-step.

---

### 1. DATABASE_URL (Required)

**What it is:** Connection string to your PlanetScale MySQL database

**Where to get it:**
1. Go to https://planetscale.com/
2. Log in to your account
3. Click on your `dealflow-network` database (or create it if you haven't)
4. Click "Connect" button in the top right
5. Select "Prisma" or "General" from the dropdown
6. Copy the connection string

**What it looks like:**
```
mysql://abc123xyz:pscale_pw_abc123@aws.connect.psdb.cloud/dealflow-network?ssl={"rejectUnauthorized":true}
```

**How to add in Vercel:**
- Name: `DATABASE_URL`
- Value: Paste the entire connection string from PlanetScale
- Environment: Check all three boxes (Production, Preview, Development)

---

### 2. JWT_SECRET (Required)

**What it is:** A secret key used to sign authentication tokens

**Where to get it:** Generate a new random secret

**How to generate:**

**Option A - Using Node.js (if you have it installed locally):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option B - Using online generator:**
Go to https://generate-secret.vercel.app/64 (or any secure random string generator)

**Option C - I can generate one for you:**
Let me know and I'll generate a secure random string

**What it looks like:**
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012345678901234567890abcdef1234567890abcdef12345678
```
(128 characters of random hex)

**How to add in Vercel:**
- Name: `JWT_SECRET`
- Value: Paste your generated secret
- Environment: Check all three boxes (Production, Preview, Development)

**Important:** Keep this secret safe. Anyone with this can forge authentication tokens.

---

### 3. RESEND_API_KEY (Required)

**What it is:** API key for sending magic link emails

**Where to get it:**
1. Go to https://resend.com/
2. Log in to your account (you mentioned you have this set up)
3. Click "API Keys" in the left sidebar
4. Click "Create API Key"
5. Give it a name like "DealFlow Production"
6. Select "Sending access" permission
7. Click "Create"
8. Copy the API key (starts with `re_`)

**What it looks like:**
```
re_123abc456def789ghi012jkl345mno678pqr
```

**How to add in Vercel:**
- Name: `RESEND_API_KEY`
- Value: Paste your Resend API key
- Environment: Check all three boxes (Production, Preview, Development)

**Note:** If you already have a Resend API key, you can reuse it. Otherwise, create a new one.

---

### 4. RESEND_FROM_EMAIL (Required)

**What it is:** The email address that magic links will be sent from

**Where to get it:** This depends on your Resend domain setup

**Option A - Using Resend's test domain (quick start):**
```
DealFlow Network <onboarding@resend.dev>
```

**Option B - Using your own verified domain (recommended for production):**
1. In Resend dashboard, go to "Domains"
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records Resend provides
4. Wait for verification
5. Use format: `DealFlow Network <noreply@yourdomain.com>`

**What it looks like:**
```
DealFlow Network <noreply@yourdomain.com>
```
or
```
DealFlow Network <onboarding@resend.dev>
```

**How to add in Vercel:**
- Name: `RESEND_FROM_EMAIL`
- Value: Your email address in the format above
- Environment: Check all three boxes (Production, Preview, Development)

**Tip:** Start with `onboarding@resend.dev` to test, then switch to your own domain later.

---

### 5. OPENAI_API_KEY (Required)

**What it is:** API key for AI-powered natural language query parsing

**Where to get it:**
1. Go to https://platform.openai.com/
2. Log in or create an account
3. Click your profile icon (top right)
4. Select "View API keys"
5. Click "Create new secret key"
6. Give it a name like "DealFlow Network"
7. Copy the key (starts with `sk-`)

**What it looks like:**
```
sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**How to add in Vercel:**
- Name: `OPENAI_API_KEY`
- Value: Paste your OpenAI API key
- Environment: Check all three boxes (Production, Preview, Development)

**Cost note:** The AI query feature uses minimal tokens. Expect ~$1-5/month for typical usage.

---

### 6. NODE_ENV (Required)

**What it is:** Tells the application it's running in production mode

**Where to get it:** Just type it manually

**What it is:**
```
production
```

**How to add in Vercel:**
- Name: `NODE_ENV`
- Value: `production`
- Environment: Check "Production" only (not Preview or Development)

---

## Optional Environment Variables

These are not required for basic functionality but enable additional features.

---

### 7. AWS_ACCESS_KEY_ID (Optional)

**What it is:** AWS credentials for S3 file storage

**When you need it:** If you want to store uploaded files (contact photos, documents) in S3

**Where to get it:**
1. Go to AWS IAM console
2. Create a new user with S3 access
3. Generate access keys

**How to add in Vercel:**
- Name: `AWS_ACCESS_KEY_ID`
- Value: Your AWS access key
- Environment: Check all three boxes

---

### 8. AWS_SECRET_ACCESS_KEY (Optional)

**What it is:** AWS secret key (pair with AWS_ACCESS_KEY_ID)

**How to add in Vercel:**
- Name: `AWS_SECRET_ACCESS_KEY`
- Value: Your AWS secret key
- Environment: Check all three boxes

---

### 9. AWS_REGION (Optional)

**What it is:** AWS region for your S3 bucket

**Example value:**
```
us-east-1
```

**How to add in Vercel:**
- Name: `AWS_REGION`
- Value: Your AWS region
- Environment: Check all three boxes

---

### 10. AWS_S3_BUCKET (Optional)

**What it is:** Name of your S3 bucket

**How to add in Vercel:**
- Name: `AWS_S3_BUCKET`
- Value: Your bucket name
- Environment: Check all three boxes

---

### 11. BRIGHTDATA_API_KEY (Optional)

**What it is:** API key for LinkedIn profile enrichment

**When you need it:** If you want automatic LinkedIn data enrichment

**Where to get it:** https://brightdata.com/

**How to add in Vercel:**
- Name: `BRIGHTDATA_API_KEY`
- Value: Your Bright Data API key
- Environment: Check all three boxes

---

### 12. TELEGRAM_BOT_TOKEN (Optional)

**What it is:** Token for Telegram bot integration

**When you need it:** If you want to capture contacts via Telegram

**Where to get it:** Create a bot with @BotFather on Telegram

**How to add in Vercel:**
- Name: `TELEGRAM_BOT_TOKEN`
- Value: Your bot token
- Environment: Check all three boxes

---

### 13. VITE_APP_TITLE (Optional)

**What it is:** Custom name for your application

**Default:** "App"

**Example:**
```
DealFlow Network
```

**How to add in Vercel:**
- Name: `VITE_APP_TITLE`
- Value: Your app name
- Environment: Check all three boxes

---

### 14. VITE_APP_LOGO (Optional)

**What it is:** URL to your custom logo image

**Example:**
```
https://yourdomain.com/logo.png
```

**How to add in Vercel:**
- Name: `VITE_APP_LOGO`
- Value: URL to your logo
- Environment: Check all three boxes

---

## Summary: Minimum Required Variables

To get your app running, you ONLY need these 6 variables:

1. **DATABASE_URL** - From PlanetScale
2. **JWT_SECRET** - Generate random string
3. **RESEND_API_KEY** - From Resend dashboard
4. **RESEND_FROM_EMAIL** - Your email address or `onboarding@resend.dev`
5. **OPENAI_API_KEY** - From OpenAI platform
6. **NODE_ENV** - Just type `production`

Everything else is optional and can be added later.

---

## How to Add Variables in Vercel

**During initial deployment:**
1. When importing your GitHub repo, Vercel shows "Environment Variables" section
2. Click "Add" for each variable
3. Enter Name and Value
4. Check which environments need it (usually all three)
5. Click "Add" again to confirm

**After deployment:**
1. Go to your project in Vercel dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in left sidebar
4. Click "Add New"
5. Enter Name, Value, and select environments
6. Click "Save"
7. Redeploy for changes to take effect

---

## Quick Copy-Paste Template

Here's a template you can fill out and have ready when deploying:

```
DATABASE_URL=mysql://[GET_FROM_PLANETSCALE]
JWT_SECRET=[GENERATE_RANDOM_STRING]
RESEND_API_KEY=re_[GET_FROM_RESEND]
RESEND_FROM_EMAIL=DealFlow Network <onboarding@resend.dev>
OPENAI_API_KEY=sk-[GET_FROM_OPENAI]
NODE_ENV=production
```

---

## Next Steps

1. Gather these 6 required values
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Add the environment variables
5. Click "Deploy"

Your app will be live in 2-3 minutes!
