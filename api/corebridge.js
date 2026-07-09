// Vercel Serverless Function — Corebridge API Proxy
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  // Get endpoint — may be passed as ?endpoint=X or as a path after /api/corebridge/
  // Also handle encoded slashes %2F in query params
  let endpoint = req.query.endpoint || '';
  endpoint = decodeURIComponent(endpoint);

  // Whitelist check — just check the base resource name
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
    // Build extra query params — everything except 'endpoint'
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    const qs = new URLSearchParams(params).toString();

    // Build the full Corebridge URL
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
    console.log('Status:', response.status, '| Preview:', text.substring(0, 100));

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
    return res.status(500).json({ error: 'Proxy failed', message: err.message, url_attempted: endpoint });
  }
};
