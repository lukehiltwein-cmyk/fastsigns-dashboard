// Vercel Serverless Function — Corebridge API Proxy
// This file lives at /api/corebridge.js in your GitHub repo
// It proxies requests to Corebridge so the browser isn't blocked by CORS

export default async function handler(req, res) {
  // Allow requests from your dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  // Which endpoint to call — passed as ?endpoint=ExOrder etc.
  const endpoint = req.query.endpoint || 'ExOrder';

  // Whitelist of allowed endpoints for security
  const allowed = [
    'ExOrder', 'ExOrderDetail', 'ExOrderProduct',
    'ExOrderProductPart', 'ExEstimate', 'ExCustomer',
    'ExEmployee', 'ExSalesperson', 'ExVendorPurchaseOrder'
  ];

  if (!allowed.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
  }

  try {
    // Build query string — pass through any extra params (like filters, dates)
    const params = { ...req.query };
    delete params.endpoint; // remove our own param
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

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      // Return as text if not JSON
      return res.status(200).send(text);
    }

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({
      error: 'Proxy failed',
      message: err.message
    });
  }
}
