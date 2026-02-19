// ============================================================
// NETLIFY FUNCTION — Airtable Proxy (fixed)
// netlify/functions/airtable.js
// ============================================================

exports.handler = async (event) => {

  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: responseHeaders, body: '' };
  }

  // Log env var presence (not values) so we can confirm they are loading
  console.log('API_KEY present:', !!API_KEY);
  console.log('BASE_ID present:', !!BASE_ID);
  console.log('BASE_ID value:', BASE_ID);

  if (!API_KEY || !BASE_ID) {
    console.log('ERROR: Missing credentials');
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Missing Airtable credentials in environment variables.' })
    };
  }

  const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {

    // ── GET ──────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const table  = event.queryStringParameters && event.queryStringParameters.table;
      const filter = event.queryStringParameters && event.queryStringParameters.filter;

      if (!table) {
        return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ error: 'table parameter required' }) };
      }

      const url = `${AT_BASE}/${encodeURIComponent(table)}` + (filter ? `?filterByFormula=${encodeURIComponent(filter)}` : '');
      console.log('GET URL:', url);

      const res  = await fetch(url, { headers });
      const text = await res.text();
      console.log('Airtable GET response:', text);

      const data = JSON.parse(text);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(data.records || []) };
    }

    // ── POST / PATCH ──────────────────────────────────────
    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body   = JSON.parse(event.body || '{}');
      const table  = body.table;
      const fields = body.fields;
      const id     = body.id;

      console.log('Table:', table);
      console.log('Fields:', JSON.stringify(fields));

      if (!table || !fields) {
        return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ error: 'table and fields required' }) };
      }

      const url    = `${AT_BASE}/${encodeURIComponent(table)}${id ? '/' + id : ''}`;
      const method = id ? 'PATCH' : 'POST';

      console.log('Sending to Airtable:', method, url);

      const res  = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ fields })
      });

      const text = await res.text();
      console.log('Airtable POST response status:', res.status);
      console.log('Airtable POST response body:', text);

      const data = JSON.parse(text);

      // Return the full Airtable response including any errors
      return {
        statusCode: res.status,
        headers: responseHeaders,
        body: JSON.stringify(data)
      };
    }

    return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.log('CAUGHT ERROR:', err.message);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
