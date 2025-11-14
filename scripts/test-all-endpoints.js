// Using native Node.js fetch (Node 18+) or http module
const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';
const TEST_PHONE = '+919352101757';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, data = null, headers = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            log(`✅ ${name}: SUCCESS`, 'green');
            resolve({ success: true, data: response });
          } else {
            log(`❌ ${name}: FAILED - ${response.error || 'Unknown error'}`, 'red');
            resolve({ success: false, error: response });
          }
        } catch (error) {
          log(`❌ ${name}: FAILED - Invalid JSON response`, 'red');
          resolve({ success: false, error: body });
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ ${name}: FAILED - ${error.message}`, 'red');
      resolve({ success: false, error: error.message });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  log('\n🧪 STARTING COMPREHENSIVE API TESTS\n', 'blue');
  log('='.repeat(50), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: Health Check
  log('\n📋 Test 1: Health Check', 'yellow');
  const health = await testEndpoint('GET /', 'GET', '/');
  results.total++;
  if (health.success) results.passed++;
  else results.failed++;
  
  // Test 2: Get All Products
  log('\n📋 Test 2: Get All Products', 'yellow');
  const products = await testEndpoint('GET /api/products', 'GET', '/api/products');
  results.total++;
  if (products.success) {
    results.passed++;
    if (products.data?.data?.length === 2) {
      log(`   📦 Found ${products.data.data.length} products`, 'green');
    } else {
      log(`   ⚠️  Expected 2 products, found ${products.data?.data?.length || 0}`, 'yellow');
    }
  } else {
    results.failed++;
  }
  
  // Test 3: Get Accessories
  log('\n📋 Test 3: Get Accessories', 'yellow');
  const accessories = await testEndpoint('GET /api/products/accessories', 'GET', '/api/products/accessories');
  results.total++;
  if (accessories.success) {
    results.passed++;
    if (accessories.data?.data?.length === 4) {
      log(`   🎒 Found ${accessories.data.data.length} accessories`, 'green');
    } else {
      log(`   ⚠️  Expected 4 accessories, found ${accessories.data?.data?.length || 0}`, 'yellow');
    }
  } else {
    results.failed++;
  }
  
  // Test 4: Send OTP
  log('\n📋 Test 4: Send OTP', 'yellow');
  const otpResponse = await testEndpoint(
    'POST /api/auth/send-otp',
    'POST',
    '/api/auth/send-otp',
    { phoneNumber: TEST_PHONE }
  );
  results.total++;
  if (otpResponse.success) {
    results.passed++;
    log(`   🔑 OTP: ${otpResponse.data.otp}`, 'green');
    log(`   📝 Verification ID: ${otpResponse.data.verificationId}`, 'green');
  } else {
    results.failed++;
  }
  
  // Test 5: Verify OTP Only
  if (otpResponse.success) {
    log('\n📋 Test 5: Verify OTP Only', 'yellow');
    const verifyResponse = await testEndpoint(
      'POST /api/auth/verify-otp-only',
      'POST',
      '/api/auth/verify-otp-only',
      {
        phoneNumber: TEST_PHONE,
        otp: otpResponse.data.otp,
        verificationId: otpResponse.data.verificationId
      }
    );
    results.total++;
    if (verifyResponse.success) results.passed++;
    else results.failed++;
  }
  
  // Test 6: Database Connection
  log('\n📋 Test 6: Database Connection', 'yellow');
  try {
    const pool = require('../config/database');
    const result = await pool.query('SELECT COUNT(*) FROM products');
    log(`✅ Database Connected: ${result.rows[0].count} products`, 'green');
    results.total++;
    results.passed++;
  } catch (error) {
    log(`❌ Database Connection: FAILED - ${error.message}`, 'red');
    results.total++;
    results.failed++;
  }
  
  // Test 7: Check Tables Exist
  log('\n📋 Test 7: Check All Tables Exist', 'yellow');
  try {
    const pool = require('../config/database');
    const tables = [
      'users', 'otps', 'products', 'product_variants', 'product_colors',
      'product_images', 'accessories', 'cart_items', 'orders', 'order_items',
      'contact_messages', 'reviews'
    ];
    
    let allTablesExist = true;
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      if (!result.rows[0].exists) {
        log(`   ❌ Table missing: ${table}`, 'red');
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      log(`✅ All ${tables.length} tables exist`, 'green');
      results.passed++;
    } else {
      log(`❌ Some tables are missing`, 'red');
      results.failed++;
    }
    results.total++;
  } catch (error) {
    log(`❌ Table Check: FAILED - ${error.message}`, 'red');
    results.total++;
    results.failed++;
  }
  
  // Final Summary
  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 TEST SUMMARY\n', 'blue');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (results.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! System is working correctly!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
  }
  
  log('\n' + '='.repeat(50) + '\n', 'blue');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});

