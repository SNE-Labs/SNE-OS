# SNE OS Deployment Guide

## Domain Configuration

**Final Domain:** `https://snelabs.space/`

### Environment Variables

```bash
# Production
VITE_API_BASE=https://snelabs.space

# Development (local backend)
VITE_API_BASE=http://localhost:5000
```

### SIWE Configuration

- **Domain:** `snelabs.space` (consistente em dev/prod)
- **URI:** `https://snelabs.space`
- **Chain ID:** `534352` (Scroll L2)

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

### Vercel Configuration

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### CORS Configuration

Backend deve permitir:
- Origin: `https://snelabs.space`
- Credentials: `true`
- Methods: `GET, POST, OPTIONS`
