// Vercel Serverless Function — Corebridge API Proxy
// Handles CORS so the browser can reach Corebridge securely

module.exports = async function handler(req, res) {
  // CORS headers — allow requests from any origin (our dashboard)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  // Endpoint passed as ?endpoint=ExOrder
  const endpoint = req.query.endpoint || 'ExOrder';

  // Security whitelist
  const allowed = [
    'ExOrder', 'ExOrderDetail', 'ExOrderProduct',
    'ExOrderProductPart', 'ExEstimate', 'ExCustomer',
    'ExEmployee', 'ExSalesperson', 'ExVendorPurchaseOrder'
  ];

  if (!allowed.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
  }

  try {
    // Forward any extra query params to Corebridge
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    const qs = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/${endpoint}${qs ? '?' + qs : ''}`;

    console.log('Proxying to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'ApiTag': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('Corebridge error:', response.status, text);
      return res.status(response.status).json({
        error: 'Corebridge API error',
        status: response.status,
        detail: text
      });
    }

    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(200).send(text);
    }

  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({
      error: 'Proxy failed',
      message: err.message
    });
  }
};
