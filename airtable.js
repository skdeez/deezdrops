// ============================================================
// NETLIFY FUNCTION — Airtable Proxy
// This function runs on Netlify's servers.
// Your API key lives in Netlify's environment variables —
// never in any file, never visible to anyone.
//
// File location: netlify/functions/airtable.js
//
// Handles all Airtable operations:
//   GET  /api/airtable?table=Drops               → fetch all rows
//   GET  /api/airtable?table=Drops&filter=...    → fetch filtered rows
//   POST /api/airtable  { table, fields }        → create a row
//   PATCH /api/airtable { table, id, fields }    → update a row
// ============================================================

exports.handler = async (event) => {

  // These are read from Netlify's environment variables —
  // set them in Netlify dashboard → Site Settings → Environment Variables
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  // If credentials are not configured, return a clear error
  if (!API_KEY || !BASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Airtable credentials not configured in Netlify environment variables.' })
    };
  }

  const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  // Allow requests from your own site only (CORS)
  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: responseHeaders, body: '' };
  }

  try {

    // ── GET: fetch rows from a table ──────────────────────
    if (event.httpMethod === 'GET') {
      const table  = event.queryStringParameters?.table;
      const filter = event.queryStringParameters?.filter;
      if (!table) return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ error: 'table parameter required' }) };

      const url = `${AT_BASE}/${encodeURIComponent(table)}`
        + (filter ? `?filterByFormula=${encodeURIComponent(filter)}` : '');

      const res  = await fetch(url, { headers });
      const data = await res.json();
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(data.records || []) };
    }

    // ── POST / PATCH: create or update a row ─────────────
    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body   = JSON.parse(event.body || '{}');
      const table  = body.table;
      const fields = body.fields;
      const id     = body.id; // only needed for PATCH

      if (!table || !fields) {
        return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ error: 'table and fields required' }) };
      }

      const url    = `${AT_BASE}/${encodeURIComponent(table)}${id ? '/' + id : ''}`;
      const method = id ? 'PATCH' : 'POST';

      const res  = await fetch(url, { method, headers, body: JSON.stringify({ fields }) });
      const data = await res.json();
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
