# Cloudflare Workers Deployment Guide

This Next.js application has been configured for deployment on Cloudflare Workers using OpenNext.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 10.9.2
- Cloudflare account
- Wrangler CLI (installed as dev dependency)

## Configuration Files

The following files have been added/modified for Cloudflare compatibility:

- **`next.config.ts`**: Configured with `output: 'standalone'` and `images.unoptimized: true`
- **`open-next.config.ts`**: OpenNext configuration specifying Cloudflare as the wrapper
- **`wrangler.toml`**: Cloudflare Workers configuration
- **`.dev.vars.example`**: Example environment variables for local development
- **`package.json`**: Added Cloudflare-specific scripts

## Local Development

### 1. Standard Next.js Development

For regular development, use the standard Next.js dev server:

```bash
npm run dev
```

This runs Next.js with Turbopack at `http://localhost:3000`.

### 2. Cloudflare Workers Development (Local Preview)

To test with the Cloudflare Workers runtime locally:

```bash
# First, build for Cloudflare
npm run build:cloudflare

# Then preview with Wrangler
npm run preview:cloudflare
```

### 3. Environment Variables

Copy `.dev.vars.example` to `.dev.vars` for local Cloudflare development:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081/api
```

## Building for Cloudflare

Build the application for Cloudflare Workers:

```bash
npm run build:cloudflare
```

This command:
1. Runs `next build` to create the Next.js production build
2. Runs `open-next build` to create the Cloudflare Workers adapter

The output will be in `.open-next/worker/`.

## Deployment Options

### Option 1: Cloudflare Pages (Recommended)

Deploy to Cloudflare Pages using Wrangler:

```bash
npm run deploy:cloudflare
```

Or deploy via the Cloudflare Dashboard:
1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Create a new project
3. Connect your Git repository
4. Set build settings:
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.open-next/worker`
   - **Root directory**: `apps/web`

### Option 2: Manual Wrangler Deployment

```bash
# Login to Cloudflare
npx wrangler login

# Deploy
npm run deploy:cloudflare
```

## Environment Variables (Production)

Set environment variables in Cloudflare Pages dashboard or via Wrangler:

```bash
# Using Wrangler CLI
wrangler pages secret put NEXT_PUBLIC_API_URL
```

Or in the Cloudflare Dashboard:
1. Go to your Pages project
2. Settings → Environment Variables
3. Add your variables

## Edge Runtime Compatibility

This app is compatible with Cloudflare Workers Edge Runtime:

- ✅ Uses browser APIs (IndexedDB, localStorage)
- ✅ No Node.js-specific APIs in client code
- ✅ Middleware uses standard Web APIs
- ✅ Image optimization disabled (not supported on Edge)
- ✅ Standalone output mode enabled

## Troubleshooting

### Font Loading Issues During Build

If you encounter Google Fonts fetch errors during build:

```
Failed to fetch font `Nunito` from Google Fonts
```

This is a network connectivity issue during build. Solutions:

1. **Use a different network**: Ensure your build environment can access `fonts.googleapis.com`
2. **CI/CD Environment**: Most CI/CD platforms (GitHub Actions, Cloudflare Pages) have proper network access
3. **Local Build**: Should work fine with proper internet connection

The fonts will load correctly at runtime even if build temporarily fails.

### Build Fails on Cloudflare Pages

Ensure your build settings are correct:
- Build command: `npm run build:cloudflare`
- Build output: `.open-next/worker`
- Node version: 18 or higher

### Runtime Errors

Check Cloudflare Pages logs:
```bash
wrangler pages deployment tail
```

## Performance Considerations

### Image Optimization

Image optimization is disabled (`images.unoptimized: true`) as Cloudflare Workers doesn't support Next.js Image Optimization. Consider:

- Using Cloudflare Images if you need optimization
- Pre-optimizing images before deployment
- Using responsive image formats (WebP, AVIF)

### Cold Starts

Cloudflare Workers have minimal cold start times compared to traditional serverless platforms, typically under 100ms.

### Caching

Cloudflare automatically caches static assets. Configure caching rules in `wrangler.toml` or the Cloudflare Dashboard.

## Architecture

```
User Request
     ↓
Cloudflare Edge Network
     ↓
Cloudflare Worker (Next.js via OpenNext)
     ↓
API Backend (FastAPI)
```

## Additional Resources

- [OpenNext Documentation](https://opennext.js.org/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)

## Support

For issues related to:
- **Cloudflare deployment**: Check Cloudflare Pages logs
- **OpenNext**: Visit [OpenNext GitHub](https://github.com/opennextjs/opennext-cloudflare)
- **Next.js compatibility**: Refer to [Next.js Documentation](https://nextjs.org/docs)
