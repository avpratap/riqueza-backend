# 🚀 Requeza Backend Setup Guide

## Prerequisites

1. **Node.js** (v14 or higher)
2. **PostgreSQL** (v12 or higher)
3. **Git** (for version control)

## 📋 Step-by-Step Setup

### 1. Install PostgreSQL

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install with default settings
- Remember the password you set for the `postgres` user

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create PostgreSQL User and Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create user (if needed)
CREATE USER postgres WITH PASSWORD 'AvBnbMPRG2512$';

# Create database
CREATE DATABASE RIQUEZA;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE RIQUEZA TO postgres;

# Exit
\q
```

### 3. Set Up Environment Variables

The `.env` file is already configured with your database credentials:

```env
DB_NAME=RIQUEZA
DB_USER=postgres
DB_PASSWORD=AvBnbMPRG2512$
DB_HOST=localhost
DB_PORT=5432
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Set Up Database Schema

```bash
npm run setup-db
```

This will:
- Create the database (if it doesn't exist)
- Create tables (users, otps)
- Create indexes for performance
- Set up triggers for automatic timestamp updates

### 6. Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 🧪 Testing the Backend

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Requeza Backend API is running",
  "timestamp": "2025-01-21T19:15:00.000Z",
  "environment": "development"
}
```

### 2. Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919352101757"}'
```

### 3. Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919352101757",
    "name": "John Doe",
    "email": "john@example.com",
    "otp": "123456",
    "verificationId": "your-verification-id"
  }'
```

### 4. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919352101757",
    "otp": "123456",
    "verificationId": "your-verification-id"
  }'
```

## 🔧 Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   # Windows
   services.msc
   
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Test connection manually:**
   ```bash
   psql -h localhost -U postgres -d RIQUEZA
   ```

3. **Check firewall settings** (if using remote database)

### Port Already in Use

If port 5000 is already in use:
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (Windows)
taskkill /PID <process_id> /F

# Or change port in .env file
PORT=5001
```

### Environment Variables Not Loading

Make sure your `.env` file is in the root directory and has the correct format:
```env
DB_NAME=RIQUEZA
DB_USER=postgres
DB_PASSWORD=AvBnbMPRG2512$
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### OTPs Table
```sql
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    verification_id VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Next Steps

1. **Test all API endpoints** using the curl commands above
2. **Set up frontend integration** to connect to the backend
3. **Configure Twilio** for production SMS delivery
4. **Set up proper logging** and monitoring
5. **Deploy to production** (Heroku, AWS, etc.)

## 📞 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify database connection
3. Ensure all environment variables are set correctly
4. Check if PostgreSQL is running and accessible

## 🎉 Success!

Once everything is working, you should see:
```
🚀 Requeza Backend Server running on port 5000
📱 Environment: development
🌐 Frontend URL: http://localhost:3000
📊 Database: RIQUEZA@localhost:5432
✅ Connected to PostgreSQL database
```
