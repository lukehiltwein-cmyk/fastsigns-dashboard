// Vercel Serverless Function — Corebridge API Proxy

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  const endpoint = req.query.endpoint || 'ExOrder';

  const allowed = [
    'ExOrder', 'ExOrderDetail', 'ExOrderProduct',
    'ExOrderProductPart', 'ExEstimate', 'ExCustomer',
    'ExEmployee', 'ExSalesperson', 'ExVendorPurchaseOrder'
  ];

  if (!allowed.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
  }

  try {
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    const qs = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/${endpoint}${qs ? '?' + qs : ''}`;

    console.log('Proxying to:', url);
    console.log('Using API key:', API_KEY.substring(0, 8) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'ApiTag': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Api-Key': API_KEY
      }
    });

    console.log('Corebridge response status:', response.status);
    const text = await response.text();
    console.log('Corebridge response preview:', text.substring(0, 200));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Corebridge API error',
        status: response.status,
        detail: text,
        url_called: url
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
