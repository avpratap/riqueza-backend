# Riqueza Electric - Backend Setup

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then edit `.env` with your actual database credentials and JWT secret:

```env
DB_HOST=your_actual_db_host
DB_USER=your_actual_db_user
DB_PASSWORD=your_actual_db_password
JWT_SECRET=generate-a-secure-random-string-here
```

**Important**: 
- `.env` is gitignored (your secrets stay safe)
- `.env.example` is committed (shows what variables are needed)
- **NO hardcoded credentials in code!**

### 3. Database Setup
Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE riqueza_db;
```

Run migration scripts if needed (check `/scripts` folder).

### 4. Run Development Server
```bash
npm run dev
```

Server will start on [http://localhost:5000](http://localhost:5000)

## 📦 Deployment

### Vercel Deployment
1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env`
4. Deploy!

## 🔧 Important Notes

- **JWT_SECRET**: Must be the same across all deployments
- **Database**: Use PostgreSQL (we use Render.com for production)
- **CORS**: Frontend URL must be whitelisted in FRONTEND_URL

**No hardcoded secrets in code!** ✅
