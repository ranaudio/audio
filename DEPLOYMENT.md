# Production Deployment Guide

## Issue: "Failed to Fetch" Audio in Production

The app works locally but fails in production due to filesystem and URL issues.

## Quick Fixes

### 1. Set Environment Variables

Add these to your production environment:

```bash
# Required for internal API calls
NEXT_PUBLIC_BASE_URL=https://your-actual-domain.com

# Your existing API keys
MINIMAX_GROUP_ID=your_minimax_group_id
MINIMAX_API_KEY=your_minimax_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 2. Platform-Specific Instructions

#### **Vercel Deployment**
1. Go to your Vercel dashboard
2. Select your project → Settings → Environment Variables
3. Add `NEXT_PUBLIC_BASE_URL` with your Vercel domain (e.g., `https://your-app.vercel.app`)
4. Redeploy your app

#### **Railway Deployment**
1. Go to your Railway dashboard
2. Select your project → Variables
3. Add `NEXT_PUBLIC_BASE_URL` with your Railway domain
4. Redeploy

#### **Netlify Deployment**
1. Go to Site settings → Environment variables
2. Add `NEXT_PUBLIC_BASE_URL` with your Netlify domain
3. Redeploy

## Long-term Solution: Cloud Storage

The current app stores audio files locally, which doesn't work in serverless environments. Here are cloud storage options:

### Option A: Vercel Blob (Easiest for Vercel)

1. Install Vercel Blob:
```bash
npm install @vercel/blob
```

2. Get your Blob token from Vercel dashboard
3. Add to environment: `BLOB_READ_WRITE_TOKEN=your_token`

### Option B: AWS S3

1. Install AWS SDK:
```bash
npm install @aws-sdk/client-s3
```

2. Add environment variables:
```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket
```

### Option C: Cloudinary

1. Install Cloudinary:
```bash
npm install cloudinary
```

2. Add environment variables:
```bash
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## Immediate Workaround

For immediate deployment, try these steps:

1. **Set the base URL environment variable** (most important)
2. **Check your deployment logs** for specific errors
3. **Verify API keys** are properly set in production
4. **Test a single chunk** first before batch processing

## Common Issues & Solutions

### 1. "Failed to fetch" errors
- ✅ Set `NEXT_PUBLIC_BASE_URL` environment variable
- ✅ Check API keys are set in production
- ✅ Verify domain is accessible

### 2. Audio files not found (404)
- 🔄 This requires cloud storage migration
- 📁 Local filesystem doesn't work in serverless

### 3. Internal API call failures
- ✅ Fixed with proper base URL detection
- ✅ Added better error handling

## Testing Your Deployment

1. Deploy with the environment variable set
2. Try generating a single chunk first
3. Check browser network tab for specific errors
4. Look at deployment logs for server-side errors

## Need Help?

If you're still having issues:
1. Share your deployment platform (Vercel/Railway/Netlify)
2. Share any error messages from browser console
3. Share any error messages from deployment logs 