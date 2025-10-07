# Requeza Backend API

A Node.js, Express, and PostgreSQL backend for the Requeza Electric Vehicle application.

## 🚀 Features

- **Authentication**: Phone number + OTP based authentication
- **User Management**: Signup, login, profile management
- **SMS Integration**: Twilio SMS service for OTP delivery
- **Database**: PostgreSQL with proper schema and relationships
- **Security**: JWT tokens, input validation, CORS protection
- **API Documentation**: RESTful API endpoints

## 📁 Project Structure

```
Requeza Backend/
├── src/
│   ├── app.js          # Express app configuration
│   └── server.js       # Server startup and database connection
├── config/
│   ├── database.js     # PostgreSQL connection pool
│   └── database.sql    # Database schema and migrations
├── controllers/
│   └── authController.js # Authentication logic
├── middleware/
│   ├── auth.js         # JWT authentication middleware
│   └── validation.js   # Input validation middleware
├── models/
│   ├── User.js         # User model and database operations
│   └── OTP.js          # OTP model and database operations
├── routes/
│   ├── auth.js         # Authentication routes
│   └── index.js        # Main router
├── utils/
│   ├── jwt.js          # JWT token utilities
│   ├── otpGenerator.js # OTP generation utilities
│   └── smsService.js   # Twilio SMS service
├── .env                # Environment variables
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb RIQUEZA
   
   # Run schema
   psql -d RIQUEZA -f config/database.sql
   ```

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Environment Variables

```env
# Database Configuration
DB_NAME=RIQUEZA
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/send-otp` | Send OTP to phone number | No |
| POST | `/api/auth/verify-otp-only` | Verify OTP without consuming | No |
| POST | `/api/auth/signup` | Create new user account | No |
| POST | `/api/auth/login` | Login existing user | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update user profile | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health status |

## 🔐 Authentication Flow

1. **Send OTP**: User enters phone number → OTP sent via SMS
2. **Verify OTP**: User enters OTP → Verification successful
3. **Signup/Login**: 
   - **Signup**: Create new user account
   - **Login**: Authenticate existing user
4. **JWT Token**: Return JWT token for authenticated requests

## 🗄️ Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `phone` (VARCHAR, UNIQUE)
- `name` (VARCHAR)
- `email` (VARCHAR, OPTIONAL)
- `role` (VARCHAR, DEFAULT 'user')
- `is_verified` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### OTPs Table
- `id` (SERIAL PRIMARY KEY)
- `phone_number` (VARCHAR)
- `otp` (VARCHAR)
- `verification_id` (VARCHAR, UNIQUE)
- `expires_at` (TIMESTAMP)
- `is_used` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMP)

## 🚀 Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Check API health
curl http://localhost:5000/api/health
```

## 🔒 Security Features

- JWT token authentication
- Input validation and sanitization
- CORS protection
- SQL injection prevention
- Rate limiting (can be added)
- Environment variable protection

## 📱 SMS Integration

The backend uses Twilio for SMS delivery:
- Development mode: OTP logged to console
- Production mode: Real SMS sent via Twilio
- OTP expires in 5 minutes
- Automatic cleanup of expired OTPs

## 🐛 Error Handling

All API responses follow this format:
```json
{
  "success": boolean,
  "message": "string",
  "error": "string",
  "data": object
}
```

## 📝 License

ISC License
