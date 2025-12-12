# DealFlow Network - Deployment Quick Reference

## Pre-Deployment Setup

### 1. PlanetScale Database Setup (5 minutes)

```
1. Go to https://planetscale.com/
2. Create database: "dealflow-network"
3. Click "Connect" → Copy connection string
4. Save connection string for Vercel
```

**Connection String Format:**
```
mysql://username:password@aws.connect.psdb.cloud/dealflow-network?ssl={"rejectUnauthorized":true}
```

---

### 2. Gather Your API Keys

You need these ready:

| Service | What You Need | Where to Get It |
|---------|---------------|-----------------|
| **Resend** | API Key | https://resend.com/api-keys |
| **OpenAI** | API Key | https://platform.openai.com/api-keys |
| **PlanetScale** | Connection String | Your database → Connect |

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 3. Push Code to GitHub

```bash
cd /home/ubuntu/dealflow-network
git add .
git commit -m "Add Vercel deployment configuration"
git push origin temp-sans-auth
```

---

## Vercel Deployment (10 minutes)

### Step 1: Import Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select branch: `temp-sans-auth` or `production`

### Step 2: Configure Build

- Framework: **Other**
- Build Command: `pnpm build`
- Output Directory: `dist/public`
- Install Command: `pnpm install`

### Step 3: Add Environment Variables

Copy and paste these into Vercel's environment variables section:

```bash
# Database
DATABASE_URL=mysql://your-planetscale-connection-string

# Security
JWT_SECRET=your-generated-64-char-secret
NODE_ENV=production

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=DealFlow Network <noreply@yourdomain.com>

# AI
OPENAI_API_KEY=sk-your-openai-api-key
```

### Step 4: Deploy

Click **"Deploy"** and wait 2-3 minutes.

---

## Post-Deployment Setup (5 minutes)

### Initialize Database

**Option A: Using Vercel CLI**
```bash
npm i -g vercel
cd /home/ubuntu/dealflow-network
vercel link
vercel env pull .env.production
pnpm db:push
```

**Option B: Using PlanetScale Console**
1. Go to PlanetScale dashboard
2. Click "Console" tab
3. Run the SQL commands from `drizzle/schema.ts`

### Add Authorized Users

Connect to your PlanetScale database and run:

```sql
INSERT INTO authorizedUsers (email, role, createdAt) VALUES
  ('scott@betterbrand.com', 'admin', NOW()),
  ('brian@discoveryblock.com', 'user', NOW()),
  ('djohnstonec@gmail.com', 'user', NOW()),
  ('christopher@alta3x.com', 'user', NOW());
```

---

## Testing (5 minutes)

1. Visit your Vercel URL (e.g., `https://dealflow-network.vercel.app`)
2. Enter an authorized email
3. Check your email for magic link
4. Click link to sign in
5. Test key features:
   - Add a contact
   - View knowledge graph
   - Try AI query

---

## Optional: Custom Domain

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `dealflow.yourdomain.com`)
3. Add DNS records as shown by Vercel
4. Update `RESEND_FROM_EMAIL` to use your domain

---

## Troubleshooting

### Build Failed
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Ensure `pnpm-lock.yaml` is committed

### Database Connection Error
- Verify `DATABASE_URL` in Vercel env vars
- Check PlanetScale database is active
- Ensure SSL parameter is in connection string

### Magic Links Not Sending
- Check `RESEND_API_KEY` is correct
- Verify domain in Resend dashboard
- Check Resend logs for errors

### Can't Sign In
- Verify email is in `authorizedUsers` table
- Check Vercel function logs
- Ensure `JWT_SECRET` is set

---

## Quick Commands

**View Vercel Logs:**
```bash
vercel logs
```

**Redeploy:**
```bash
git push origin main  # Auto-deploys on push
```

**Add Environment Variable:**
```bash
vercel env add VARIABLE_NAME
```

**Pull Latest Env Vars:**
```bash
vercel env pull
```

---

## Total Time Estimate

- **Pre-deployment setup:** 5 minutes
- **Vercel deployment:** 10 minutes
- **Post-deployment setup:** 5 minutes
- **Testing:** 5 minutes

**Total: ~25 minutes** for complete deployment

---

## Support

- Full guide: See `VERCEL_DEPLOYMENT.md`
- Vercel docs: https://vercel.com/docs
- PlanetScale docs: https://planetscale.com/docs
- Resend docs: https://resend.com/docs
