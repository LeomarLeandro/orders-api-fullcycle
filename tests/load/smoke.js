import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '15s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  const payload = JSON.stringify({
    customerId: `customer-${__VU}`,
    items: [{ productId: 'sku-001', quantity: 2, unitPrice: 49.9 }],
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const createRes = http.post(`${BASE_URL}/orders`, payload, params);
  check(createRes, {
    'create order status is 201': (r) => r.status === 201,
  });

  if (createRes.status === 201) {
    const orderId = createRes.json('id');
    const getRes = http.get(`${BASE_URL}/orders/${orderId}`);
    check(getRes, {
      'get order status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
