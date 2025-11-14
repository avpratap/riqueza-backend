# Complete Database Setup Instructions

## Step 1: Create Environment File

Create a file named `.env` in the `Riqueza_ backend` directory with the following content:

```env
# Database Configuration - NEW RENDER DATABASE
DB_USER=riqueza_user
DB_HOST=dpg-d49068re5dus73cffpeg-a.singapore-postgres.render.com
DB_NAME=riqueza
DB_PASSWORD=9DM7cjs36XvrCD5eYGYKE3gK5ckJKWwa
DB_PORT=5432

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

# Twilio SMS Configuration (update with your actual credentials)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_SERVICE_SID=your_twilio_verify_service_sid

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

## Step 2: Run Database Setup Script

This will create all tables and insert sample data:

```bash
cd "Riqueza_ backend"
node scripts/complete-database-setup.js
```

## Step 3: Start Backend Server

```bash
npm run dev
```

## What Gets Created

The setup script will create:

### Authentication Tables
- `users` - User accounts
- `otps` - OTP verification codes

### Product Tables
- `products` - Main product information
- `product_variants` - Different battery/spec variants
- `product_colors` - Available colors
- `product_images` - Product images
- `product_specifications` - Technical specifications
- `product_features` - Product features
- `accessories` - Available accessories

### Order & Cart Tables
- `cart_items` - Shopping cart items
- `orders` - Order information
- `order_items` - Items in each order
- `order_status_history` - Order status tracking

### Other Tables
- `contact_messages` - Contact form submissions
- `reviews` - Product reviews

### Sample Data
- 2 Products: Riqueza S1 Pro+ and Riqueza S1 Pro
- 4 Variants for each product
- 4 Colors for each product
- 6 Images for each product
- 4 Accessories

## Verification

After running the setup, you should see:
```
🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!
```

Then test the connection:
```bash
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
🚀 Riqueza Backend Server running on port 5000
```

## API Endpoints to Test

Once the server is running:

- **Health Check**: http://localhost:5000/
- **Products**: http://localhost:5000/api/products
- **Single Product**: http://localhost:5000/api/products/:id

## Troubleshooting

### Connection Issues
- Verify database credentials in `.env`
- Check if Render database is accessible
- Ensure SSL is enabled (already configured in database.js)

### Script Errors
- Check if all dependencies are installed: `npm install`
- Verify PostgreSQL is accessible from your network
- Check Render database logs

## Next Steps

1. Update Twilio credentials in `.env` for SMS/OTP functionality
2. Start frontend server (see frontend instructions)
3. Test the complete application flow

