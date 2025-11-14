const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('../routes');

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3003',
  'https://localhost:3000',
  'https://localhost:3003',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches Vercel preview deployments
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} ${req.originalUrl}`);
  console.log('Request body:', req.body);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Riqueza Electric Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders'
    },
    documentation: 'https://github.com/avpratap/riqueza-backend'
  });
});

// Routes
app.use('/api', routes);

// Debug: Log route registration
console.log('🔌 Routes registered at /api');
console.log('📋 Available routes:');
console.log('  POST /api/auth/send-otp');
console.log('  POST /api/auth/verify-otp-only');
console.log('  POST /api/auth/signup');
console.log('  POST /api/auth/login');
console.log('  GET  /api/health');

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path, req.originalUrl);
  console.log('Request headers:', req.headers);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    message: `The endpoint ${req.method} ${req.path} was not found. Available endpoints: /api/auth/send-otp, /api/auth/login, /api/health`
  });
});

module.exports = app;
