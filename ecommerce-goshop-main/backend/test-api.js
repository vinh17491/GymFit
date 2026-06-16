const http = require('http');

const BASE = 'http://localhost:3000';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const results = {};

  // 1. Backend check / health
  try {
    const r = await request('GET', '/products');
    // If we get any response (even 404/500), backend is running
    results.backend = { status: 'PASS', detail: 'Server responded on port 3000', httpCode: r.status };
  } catch (e) {
    results.backend = { status: 'FAIL', detail: e.message };
  }

  // 2. Register
  const testEmail = 'apitest_' + Date.now() + '@test.com';
  try {
    const r = await request('POST', '/auth/register', {
      email: testEmail,
      password: 'Test123!',
      fullName: 'API Test User'
    });
    if (r.status === 201) {
      results.register = { status: 'PASS', detail: 'User created', email: testEmail };
      results._accessToken = r.body.accessToken;
      results._refreshToken = r.body.refreshToken;
    } else {
      results.register = { status: 'FAIL', detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
    }
  } catch (e) {
    results.register = { status: 'FAIL', detail: e.message };
  }

  // 3. Login
  try {
    const r = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'Test123!'
    });
    if (r.status === 200) {
      results.login = { status: 'PASS', detail: 'Login successful' };
      results._accessToken = r.body.accessToken;
      results._refreshToken = r.body.refreshToken;
    } else {
      results.login = { status: 'FAIL', detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
    }
  } catch (e) {
    results.login = { status: 'FAIL', detail: e.message };
  }

  // 4. Refresh Token
  try {
    if (results._refreshToken) {
      const r = await request('POST', '/auth/refresh-token', {
        refreshToken: results._refreshToken
      });
      if (r.status === 200) {
        results.refreshToken = { status: 'PASS', detail: 'Token refreshed' };
        results._accessToken = r.body.accessToken;
        results._refreshToken = r.body.refreshToken;
      } else {
        results.refreshToken = { status: 'FAIL', detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
      }
    } else {
      results.refreshToken = { status: 'SKIP', detail: 'No refresh token available' };
    }
  } catch (e) {
    results.refreshToken = { status: 'FAIL', detail: e.message };
  }

  // 5. Stripe Checkout Session (requires auth)
  // Check if Stripe key is configured first
  try {
    if (results._accessToken) {
      const r = await request('POST', '/checkout/create-session', {
        lineItems: [{ price: 'price_1Thj3qRlGHhzwvbr5hfBtWEa', quantity: 1 }]
      }, { Authorization: 'Bearer ' + results._accessToken });
      if (r.status === 201) {
        results.stripeCheckout = { status: 'PASS', detail: 'Session created: ' + r.body.sessionId };
      } else {
        // If Stripe key is invalid, the error should be from Stripe API
        results.stripeCheckout = { status: 'FAIL', detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
      }
    } else {
      results.stripeCheckout = { status: 'SKIP', detail: 'No auth token' };
    }
  } catch (e) {
    results.stripeCheckout = { status: 'FAIL', detail: e.message };
  }

  // 6. Webhook - test that the endpoint exists
  try {
    const r = await request('POST', '/webhook', { type: 'test' });
    // Webhook uses raw body parser, so JSON won't parse - we just check it's not 404
    if (r.status !== 404) {
      results.webhook = { status: 'PASS', detail: `Webhook endpoint reached, HTTP ${r.status}` };
    } else {
      results.webhook = { status: 'FAIL', detail: 'Webhook endpoint not found (404)' };
    }
  } catch (e) {
    results.webhook = { status: 'FAIL', detail: e.message };
  }

  // Print results
  console.log('========================================');
  console.log('      BACKEND API TEST RESULTS');
  console.log('========================================');
  console.log('');
  for (const [key, val] of Object.entries(results)) {
    if (key.startsWith('_')) continue;
    console.log(`  ${key.toUpperCase()}: ${val.status}`);
    console.log(`    Detail: ${val.detail}`);
    console.log('');
  }
  console.log('========================================');
}

main().catch(console.error);