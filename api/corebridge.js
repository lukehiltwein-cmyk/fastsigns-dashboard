// Vercel Serverless Function — Corebridge API Proxy
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  let endpoint = decodeURIComponent(req.query.endpoint || 'ExOrder');

  const allowedBases = [
    'ExOrder', 'ExOrderDetail', 'ExOrderProduct', 'ExOrderProductPart',
    'ExEstimate', 'ExCustomer', 'ExEmployee', 'ExSalesperson',
    'ExVendorPurchaseOrder', 'ExContact'
  ];

  const base = endpoint.split('/')[0];
  if (!base || !allowedBases.includes(base)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
  }

  try {
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    const qs = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/${endpoint}${qs ? '?' + qs : ''}`;

    console.log('Proxying to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Corebridge requires "BASIC " prefix on the API key
        'Authorization': `BASIC ${API_KEY}`,
        'ApiTag': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const text = await response.text();
    console.log('Status:', response.status, '| Preview:', text.substring(0, 150));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Corebridge API error',
        status: response.status,
        detail: text,
        url_called: url
      });
    }

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(200).send(text);
    }

  } catch (err) {
    return res.status(500).json({ error: 'Proxy failed', message: err.message });
  }
};
