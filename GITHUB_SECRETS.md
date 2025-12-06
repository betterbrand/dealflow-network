# GitHub Actions Secrets Configuration

To enable the CI/CD pipeline to run tests and builds, add these secrets to your GitHub repository.

## How to Add Secrets

1. Go to: https://github.com/betterbrand/dealflow-network/settings/secrets/actions
2. Click "New repository secret" for each secret below
3. Copy the name and value exactly as shown

## Required Secrets

### Database & Authentication

**Name:** `DATABASE_URL`  
**Value:** `mysql://4Kbgdc4rJNwddMx.root:2Ig1SFzDxI85ty77VzSs@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/XRJ2T4W7Twsw8KZjoKBden?ssl={"rejectUnauthorized":true}`

**Name:** `JWT_SECRET`  
**Value:** `5jDB2c7RUd6UVCPjioDFce`

### OAuth Configuration

**Name:** `OAUTH_SERVER_URL`  
**Value:** `https://api.manus.im`

**Name:** `VITE_OAUTH_PORTAL_URL`  
**Value:** `https://manus.im`

**Name:** `VITE_APP_ID`  
**Value:** `XRJ2T4W7Twsw8KZjoKBden`

### Owner Information

**Name:** `OWNER_OPEN_ID`  
**Value:** `Cke4qdD9MHTFRMvRjUwis2`

**Name:** `OWNER_NAME`  
**Value:** `Scott Berenzweig`

### Manus API Keys (Server-side)

**Name:** `BUILT_IN_FORGE_API_URL`  
**Value:** `https://forge.manus.ai`

**Name:** `BUILT_IN_FORGE_API_KEY`  
**Value:** `Gg834megbjpeDZwwLy88FW`

### Manus API Keys (Frontend)

**Name:** `VITE_FRONTEND_FORGE_API_URL`  
**Value:** `https://forge.manus.ai`

**Name:** `VITE_FRONTEND_FORGE_API_KEY`  
**Value:** `GwPgkp3YdvmsFa9JkVQ4o7`

## Verification

After adding all secrets, the next push to `main` will trigger the CI/CD workflow with full test coverage and build verification.

You can verify the secrets are configured correctly by checking:
https://github.com/betterbrand/dealflow-network/settings/secrets/actions

## Security Note

These secrets are specific to your Manus development environment. Never commit them to the repository or share them publicly.
