const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (chunk) => {
          chunks += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: chunks });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const checkout = await post('/subscription/checkout', {
      userId: 'verify-user-123',
      plan: 'bronze',
      name: 'Verifier',
      email: 'verify@example.com',
    });
    console.log('CHECKOUT_STATUS', checkout.statusCode);
    console.log(checkout.body);

    const upgrade = await post('/subscription/upgrade', {
      userId: 'verify-user-123',
      plan: 'bronze',
      name: 'Verifier',
      email: 'verify@example.com',
      paymentId: 'test-payment-1',
      orderId: 'order_1',
      amount: 499,
    });
    console.log('UPGRADE_STATUS', upgrade.statusCode);
    console.log(upgrade.body);
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
