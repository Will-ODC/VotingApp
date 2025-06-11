# VotingApp Railway Deployment Guide

## Pre-Deployment Checklist

### 1. Code Preparation
- [ ] All changes committed to Git
- [ ] `.env.example` file created
- [ ] `railway.json` configuration added
- [ ] `nixpacks.toml` configuration added
- [ ] `package.json` updated with Node version

### 2. Database Migration Required
**Current**: SQLite (file-based)  
**Target**: PostgreSQL (cloud database)

⚠️ **Important**: SQLite won't work on Railway because the database file gets wiped on each deployment.

### 3. Required Code Changes for PostgreSQL

#### Install PostgreSQL package:
```bash
npm install pg
```

#### Update database.js to support both SQLite (local) and PostgreSQL (production):
```javascript
// This is a simplified example - you'll need to update your database.js
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  // Use SQLite for local development
  const sqlite3 = require('sqlite3').verbose();
  // ... existing SQLite code
} else {
  // Use PostgreSQL for production
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  // ... PostgreSQL code
}
```

## Deployment Steps

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify your email

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your repositories
4. Select your VotingApp repository

### Step 3: Add PostgreSQL Database
1. In your Railway project dashboard, click "+ New"
2. Select "Database"
3. Choose "Add PostgreSQL"
4. Wait for database to provision

### Step 4: Configure Environment Variables
1. Click on your app service in Railway
2. Go to "Variables" tab
3. Add these variables:
```
SESSION_SECRET=generate-a-long-random-string-here
NODE_ENV=production
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=strong-password-here
ADMIN_EMAIL=admin@yourdomain.com
```

### Step 5: Deploy
1. Railway will automatically deploy when connected
2. Monitor the build logs for errors
3. If deployment fails, check logs and fix issues

### Step 6: Initialize Database
1. Click on the PostgreSQL service
2. Go to "Data" tab
3. Run your schema.sql queries to create tables
4. The admin user will be created on first app startup

### Step 7: Test Your App
1. Click on your app's generated URL
2. Test all functionality:
   - [ ] User registration
   - [ ] Login/logout
   - [ ] Create poll
   - [ ] Vote on poll
   - [ ] View results

## Common Issues & Solutions

### Issue: "Cannot find module 'pg'"
**Solution**: Make sure to install pg package and push to GitHub

### Issue: Database connection errors
**Solution**: Check DATABASE_URL is properly set in environment variables

### Issue: Sessions not persisting
**Solution**: Ensure SESSION_SECRET is set and NODE_ENV=production

### Issue: App crashes on startup
**Solution**: Check logs in Railway dashboard, usually missing dependencies

## Post-Deployment Tasks

- [ ] Test all features thoroughly
- [ ] Set up custom domain (optional)
- [ ] Configure database backups
- [ ] Monitor usage to stay within limits
- [ ] Share URL with your founding community members

## Monitoring & Maintenance

- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, Memory, Network usage visible
- **Alerts**: Set up notifications for crashes
- **Updates**: Push to GitHub to auto-deploy

## Next Steps After Deployment

1. **Implement PostgreSQL support** (highest priority)
2. **Test with founding members** (get early feedback)
3. **Set up monitoring** (track errors and performance)
4. **Plan for scale** (when to upgrade plans)

---

Remember: The main blocker is converting from SQLite to PostgreSQL. Once that's done, Railway deployment is straightforward!