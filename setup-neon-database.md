# Neon Database Setup Commands

## 1. Install dependencies (if not already done)
```bash
npm install
```

## 2. Generate Prisma client
```bash
npx prisma generate
```

## 3. Push schema to Neon database
```bash
npx prisma db push
```

## 4. (Optional) Seed with sample data
```bash
npx prisma db seed
```

## 5. View your database in Prisma Studio
```bash
npx prisma studio
```

## Environment Variables Needed:
```env
DATABASE_URL="your_neon_connection_string_here"
```

## Verification Commands:
```bash
# Check database connection
npx prisma db pull

# View database structure
npx prisma studio
```