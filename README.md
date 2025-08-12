# Pipedrive Plugin Static Hosting

Static file hosting for Pipedrive NIP-GUS plugin.

## Structure

- `public/` - Static files served by Express
- `server.js` - Express server for hosting
- `railway.json` - Railway deployment configuration

## URLs

- **Manifest**: `/manifest.json`
- **Plugin bundle**: `/app.js`
- **Health check**: `/health`

## Deployment

This repo is automatically deployed to Railway when pushed to GitHub.

## Usage

Install in Pipedrive using the manifest URL:
```
https://your-railway-app.railway.app/manifest.json
```
