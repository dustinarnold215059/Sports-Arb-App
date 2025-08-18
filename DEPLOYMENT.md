# Sports Arbitrage Platform - Deployment Guide

## Vercel Deployment Configuration

### Prerequisites
1. Vercel account
2. PostgreSQL database (e.g., Supabase, PlanetScale, Neon)
3. Redis instance (e.g., Upstash, Railway)
4. GitHub repository connected to Vercel

### Environment Variables Setup

#### Required Environment Variables for Production

Set these in your Vercel dashboard under Project Settings > Environment Variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
DIRECT_URL="postgresql://username:password@hostname:port/database?sslmode=require"

# Authentication
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret-key-min-32-chars"
JWT_SECRET="your-jwt-secret-key-min-32-chars"

# Session & Security
SESSION_SECRET="your-session-secret-key-min-32-chars"
ENCRYPTION_KEY="your-encryption-key-exactly-32-chars"

# Redis Configuration
REDIS_URL="redis://username:password@hostname:port"

# Rate Limiting
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"

# Admin Configuration
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_DEFAULT_PASSWORD="secure-admin-password"

# CORS
ALLOWED_ORIGINS="https://your-domain.vercel.app,https://your-custom-domain.com"

# Node Environment
NODE_ENV="production"
```

### Database Setup

#### 1. PostgreSQL Provider Setup

**Option A: Supabase (Recommended)**
1. Create account at supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy connection string
5. Set as DATABASE_URL and DIRECT_URL

**Option B: PlanetScale**
1. Create account at planetscale.com
2. Create database
3. Create branch and promotion request
4. Copy connection strings

**Option C: Neon**
1. Create account at neon.tech
2. Create database
3. Copy connection string

#### 2. Redis Setup

**Option A: Upstash (Recommended)**
1. Create account at upstash.com
2. Create Redis database
3. Copy REDIS_URL

**Option B: Railway**
1. Create account at railway.app
2. Deploy Redis
3. Copy connection string

### Deployment Steps

#### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Production deployment preparation"
git push origin main
```

#### 2. Vercel Configuration
1. Connect repository to Vercel
2. Set environment variables in dashboard
3. Configure build settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next`
   - Install Command: `npm install`

#### 3. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations to production database
npx prisma migrate deploy

# Seed production database
npm run db:prod-migrate
```

#### 4. Deploy
```bash
# Deploy to production
npm run deploy:vercel

# Or through Vercel dashboard
# - Push to main branch triggers auto-deploy
```

### Post-Deployment Configuration

#### 1. Verify Deployment
```bash
# Run health check
npm run health-check

# Or visit: https://your-domain.vercel.app/api/health
```

#### 2. Admin Access
1. Visit: `https://your-domain.vercel.app/admin`
2. Login with admin credentials set in environment variables
3. Verify all systems are operational

#### 3. Domain Setup (Optional)
1. Add custom domain in Vercel dashboard
2. Update NEXTAUTH_URL and ALLOWED_ORIGINS
3. Update any hardcoded URLs

### Monitoring & Maintenance

#### 1. Health Monitoring
- Health endpoint: `/api/health`
- Admin dashboard: `/admin/dashboard`
- System alerts: `/api/admin/system/alerts`

#### 2. Database Monitoring
- Connection pool status
- Query performance
- Backup status

#### 3. Backup Management
- Automatic daily backups (if configured)
- Manual backup: `/api/admin/system/backup`
- Backup retention: 30 days (configurable)

### Troubleshooting

#### Common Issues

**1. Database Connection Errors**
- Verify DATABASE_URL format
- Check IP allowlisting
- Ensure SSL mode is required

**2. Redis Connection Issues**
- Verify REDIS_URL format
- Check Redis provider status
- Review connection limits

**3. Build Failures**
- Check Node.js version compatibility
- Verify environment variables
- Review build logs in Vercel

**4. Authentication Issues**
- Verify NEXTAUTH_SECRET is set
- Check JWT_SECRET length (min 32 chars)
- Ensure NEXTAUTH_URL matches deployment URL

#### Environment Variables Validation

The app validates required environment variables on startup:
- DATABASE_URL
- NEXTAUTH_SECRET
- JWT_SECRET
- SESSION_SECRET

#### Logs and Debugging
- Vercel function logs in dashboard
- Application logs in `/api/admin/system/logs`
- Error tracking (if Sentry configured)

### Security Considerations

1. **Environment Variables**: Never commit secrets to repository
2. **Database**: Use SSL connections and strong passwords
3. **Rate Limiting**: Configured automatically
4. **CORS**: Restrict origins to your domains
5. **Session Security**: HttpOnly cookies with secure flags

### Performance Optimization

1. **Database**: Connection pooling enabled
2. **Caching**: Redis for sessions and API responses
3. **CDN**: Vercel Edge Network
4. **Compression**: Gzip enabled
5. **Monitoring**: Performance metrics tracked

### Support

For deployment issues:
1. Check Vercel deployment logs
2. Review application health endpoint
3. Monitor system alerts in admin dashboard
4. Check database and Redis provider status