# DealFlow Network - Deployment Notes

## Environment Variables

This application requires the following environment variables to be set:

### Backend Variables
- `DATABASE_URL` - MySQL database connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 3000)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `RESEND_API_KEY` - Resend API key for email delivery
- `RESEND_FROM_EMAIL` - Email address for sending emails

### Frontend Variables (VITE)
These variables are replaced at BUILD TIME by Vite:

- `VITE_APP_TITLE` - Application title (e.g., "DealFlow Network")
- `VITE_APP_LOGO` - Application logo URL
- `VITE_APP_ID` - Manus application ID
- `VITE_OAUTH_PORTAL_URL` - OAuth portal URL
- `VITE_FRONTEND_FORGE_API_URL` - Forge API endpoint
- `VITE_FRONTEND_FORGE_API_KEY` - Forge API key

## Railway Deployment

When deploying to Railway:
1. Add all environment variables to the service
2. Railway will automatically rebuild when variables are added
3. VITE variables are processed during the build phase
4. The build command: `vite build && esbuild server/_core/index.ts ...`

## Build Process

1. Frontend build: `vite build` - Compiles React app with VITE variable substitution
2. Backend build: `esbuild server/_core/index.ts` - Bundles Node.js server
3. Output: `dist/` directory with compiled assets

Last updated: December 14, 2025
