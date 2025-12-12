# DealFlow Network - Vercel Deployment Guide

This guide will walk you through deploying DealFlow Network to Vercel with PlanetScale MySQL and Resend email service.

---

## Prerequisites

You should have:
- [x] Vercel account (free tier is fine)
- [x] PlanetScale account (you mentioned you have this)
- [x] Resend account with API key (you mentioned this is set up)
- [x] GitHub repository with the code

---

## Step 1: Set Up PlanetScale Database

### 1.1 Create Database

1. Go to https://planetscale.com/
2. Click "Create database"
3. Name it `dealflow-network`
4. Select a region close to your users
5. Click "Create database"

### 1.2 Get Connection String

1. In your PlanetScale dashboard, click on your database
2. Click "Connect"
3. Select "Prisma" or "General" from the dropdown
4. Copy the connection string (it looks like this):
   ```
   mysql://username:password@aws.connect.psdb.cloud/dealflow-network?ssl={"rejectUnauthorized":true}
   ```
5. Save this - you'll need it for Vercel environment variables

### 1.3 Enable Safe Migrations (Optional)

PlanetScale has a feature called "safe migrations" that's great for production:
1. Go to Settings → General
2. Enable "Safe migrations" if you want to review schema changes before applying

---

## Step 2: Push Your Code to GitHub

If you haven't already:

```bash
cd /home/ubuntu/dealflow-network
git add .
git commit -m "Add Vercel deployment configuration"
git push origin temp-sans-auth
```

Or create a new production branch:

```bash
git checkout -b production
git add .
git commit -m "Production deployment setup"
git push origin production
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project

1. Go to https://vercel.com/
2. Click "Add New..." → "Project"
3. Import your `dealflow-network` repository from GitHub
4. Select the branch you want to deploy (e.g., `production` or `temp-sans-auth`)

### 3.2 Configure Build Settings

Vercel should auto-detect most settings, but verify:

- **Framework Preset:** Other
- **Build Command:** `pnpm build`
- **Output Directory:** `dist/public`
- **Install Command:** `pnpm install`
- **Node Version:** 20.x

### 3.3 Add Environment Variables

Click "Environment Variables" and add the following:

#### Required Variables

| Name | Value | Where to Get It |
|------|-------|----------------|
| `DATABASE_URL` | Your PlanetScale connection string | PlanetScale dashboard → Connect |
| `JWT_SECRET` | A random 64-character string | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `RESEND_API_KEY` | Your Resend API key | Resend dashboard → API Keys |
| `RESEND_FROM_EMAIL` | `DealFlow Network <noreply@yourdomain.com>` | Use your verified domain in Resend |
| `OPENAI_API_KEY` | Your OpenAI API key | OpenAI dashboard → API Keys |
| `NODE_ENV` | `production` | Just type "production" |

#### Optional Variables (if you use these services)

| Name | Value | Purpose |
|------|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your AWS key | For S3 file storage |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret | For S3 file storage |
| `AWS_REGION` | e.g., `us-east-1` | For S3 file storage |
| `AWS_S3_BUCKET` | Your bucket name | For S3 file storage |
| `BRIGHTDATA_API_KEY` | Your Bright Data key | For LinkedIn enrichment |
| `TELEGRAM_BOT_TOKEN` | Your bot token | For Telegram integration |
| `VITE_APP_TITLE` | `DealFlow Network` | Custom app title |
| `VITE_APP_LOGO` | URL to your logo | Custom app logo |

**Important:** Make sure all environment variables are set for **Production**, **Preview**, and **Development** environments in Vercel.

### 3.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Vercel will provide you with a URL like: `https://dealflow-network.vercel.app`

---

## Step 4: Run Database Migrations

After your first deployment, you need to initialize the database schema.

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   cd /home/ubuntu/dealflow-network
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.production
   ```

4. Run migrations:
   ```bash
   pnpm db:push
   ```

### Option B: Using PlanetScale CLI

1. Install PlanetScale CLI: https://github.com/planetscale/cli
2. Connect to your database:
   ```bash
   pscale shell dealflow-network main
   ```
3. Manually run the SQL from your Drizzle schema

### Option C: Using a Local Script

1. Temporarily set your local `DATABASE_URL` to the PlanetScale connection string
2. Run `pnpm db:push` locally
3. Remove the production DATABASE_URL from your local `.env`

---

## Step 5: Initialize Authorized Users

After migrations, you need to add authorized users who can log in.

### Option A: Using Vercel Serverless Function

Create a one-time setup script:

1. Add a temporary API route in `api/setup.js`:
   ```javascript
   import { initializeAuthorizedUsers } from '../server/db-authorized-users.js';
   
   export default async function handler(req, res) {
     if (req.method !== 'POST' || req.headers['x-setup-key'] !== process.env.SETUP_KEY) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     
     await initializeAuthorizedUsers();
     res.json({ success: true });
   }
   ```

2. Add `SETUP_KEY` environment variable in Vercel
3. Deploy
4. Call the endpoint: `curl -X POST https://your-app.vercel.app/api/setup -H "x-setup-key: your-secret"`
5. Remove the setup route and redeploy

### Option B: Direct Database Insert

Connect to PlanetScale and run:

```sql
INSERT INTO authorizedUsers (email, role, createdAt) VALUES
  ('scott@betterbrand.com', 'admin', NOW()),
  ('brian@discoveryblock.com', 'user', NOW()),
  ('djohnstonec@gmail.com', 'user', NOW()),
  ('christopher@alta3x.com', 'user', NOW());
```

---

## Step 6: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain (e.g., `dealflow.yourdomain.com`)
3. Follow Vercel's instructions to add DNS records
4. Update `RESEND_FROM_EMAIL` to use your custom domain

---

## Step 7: Test Your Deployment

1. Visit your Vercel URL
2. Enter an authorized email address
3. Check your email for the magic link
4. Click the link to sign in
5. Verify all features work:
   - Dashboard loads
   - Can add contacts
   - Knowledge graph renders
   - AI query works

---

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Check that all dependencies are in `package.json`
- Verify `pnpm-lock.yaml` is committed to git

**Error: "Build exceeded maximum duration"**
- Upgrade to Vercel Pro for longer build times
- Or optimize your build process

### Database Connection Issues

**Error: "Connection refused"**
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check that PlanetScale database is active
- Ensure SSL is included in connection string

**Error: "Table doesn't exist"**
- Run database migrations (see Step 4)

### Magic Link Not Working

**Emails not sending:**
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for error logs
- Ensure `RESEND_FROM_EMAIL` uses a verified domain

**Magic link expired:**
- Links expire after 15 minutes
- Request a new one

**Can't sign in:**
- Verify email is in `authorizedUsers` table
- Check browser console for errors
- Review Vercel function logs

### Viewing Logs

1. Go to Vercel dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by function or time range

---

## Production Checklist

Before going live:

- [ ] Database migrations applied
- [ ] Authorized users added
- [ ] All environment variables set
- [ ] Custom domain configured (optional)
- [ ] Resend domain verified
- [ ] Magic link authentication tested
- [ ] All features tested in production
- [ ] Error monitoring set up (optional: Sentry)
- [ ] Backups configured for PlanetScale
- [ ] Team members added to Vercel project

---

## Maintenance

### Adding New Authorized Users

**Option 1: Admin UI**
- Use the Admin Users page in the application (if you're an admin)

**Option 2: Direct Database**
- Connect to PlanetScale
- Run: `INSERT INTO authorizedUsers (email, role, createdAt) VALUES ('new@email.com', 'user', NOW());`

### Database Schema Changes

1. Update `drizzle/schema.ts` locally
2. Run `pnpm db:push` to generate migration
3. Test locally
4. Commit and push to GitHub
5. Vercel will auto-deploy
6. Migrations run automatically on deploy

### Monitoring

**Vercel Analytics:**
- Enable in project settings for traffic insights

**PlanetScale Insights:**
- Monitor query performance
- Track database size
- Review slow queries

**Resend Dashboard:**
- Monitor email delivery rates
- Check bounce rates
- Review spam complaints

---

## Scaling Considerations

### Free Tier Limits

**Vercel:**
- 100 GB bandwidth/month
- 100 GB-hours serverless function execution
- Unlimited deployments

**PlanetScale:**
- 5 GB storage
- 1 billion row reads/month
- 10 million row writes/month

**Resend:**
- 3,000 emails/month
- 100 emails/day

### When to Upgrade

Consider upgrading when you:
- Exceed free tier limits
- Need longer serverless function timeouts
- Want custom domain on Vercel
- Need more database storage
- Send more than 3,000 emails/month

---

## Cost Estimates

**Minimal Setup (Free Tier):**
- Vercel: $0/month
- PlanetScale: $0/month
- Resend: $0/month (up to 3,000 emails)
- **Total: $0/month**

**Small Team (Paid Tier):**
- Vercel Pro: $20/month
- PlanetScale Scaler: $29/month
- Resend Pro: $20/month
- **Total: $69/month**

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **PlanetScale Docs:** https://planetscale.com/docs
- **Resend Docs:** https://resend.com/docs
- **Drizzle ORM Docs:** https://orm.drizzle.team/

---

## Summary

Your DealFlow Network application is now deployed to Vercel with:

- **Permanent hosting** with automatic HTTPS
- **Serverless backend** that scales automatically
- **PlanetScale MySQL** for reliable database
- **Resend email** for magic link authentication
- **Automatic deployments** on git push
- **Zero maintenance** infrastructure

The deployment is production-ready and can handle your team's needs while staying within free tier limits for small teams.
