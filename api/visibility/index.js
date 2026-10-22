/*
  /api/visibility
  GET  -> { overrides: { "<brochure id>": true|false } }  (anyone; staff also get who/when)
  POST -> { id, visible }                                  (staff role only)

  Visibility is stored in one JSON blob. The app setting VISIBILITY_BLOB_URL holds
  a SAS URL to that blob with Read + Write permission (see README).
  Anything not in the blob falls back to "visible" in brochures.json.
*/
const BLOB = process.env.VISIBILITY_BLOB_URL;

function principal(req) {
  const h = req.headers['x-ms-client-principal'];
  if (!h) return null;
  try { return JSON.parse(Buffer.from(h, 'base64').toString('utf8')); } catch (e) { return null; }
}

function isStaff(p) {
  return !!(p && Array.isArray(p.userRoles) && p.userRoles.indexOf('staff') >= 0);
}

async function readStore() {
  const r = await fetch(BLOB, { headers: { 'x-ms-version': '2021-08-06' } });
  if (r.status === 404) return { overrides: {} };
  if (!r.ok) throw new Error('read failed: HTTP ' + r.status);
  const data = await r.json();
  return data && typeof data.overrides === 'object' ? data : { overrides: {} };
}

async function writeStore(store) {
  const r = await fetch(BLOB, {
    method: 'PUT',
    headers: {
      'x-ms-version': '2021-08-06',
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-blob-content-type': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(store, null, 2)
  });
  if (!r.ok) throw new Error('write failed: HTTP ' + r.status);
}

function reply(context, status, body) {
  context.res = {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

module.exports = async function (context, req) {
  if (!BLOB) return reply(context, 500, { error: 'VISIBILITY_BLOB_URL is not set in the Static Web App environment variables.' });
  const p = principal(req);
  try {
    if (req.method === 'GET') {
      const store = await readStore();
      const out = {};
      Object.keys(store.overrides).forEach(function (id) {
        const o = store.overrides[id];
        out[id] = isStaff(p) ? o : !!o.visible;
      });
      return reply(context, 200, { overrides: out });
    }

    if (!isStaff(p)) return reply(context, 403, { error: 'Staff only.' });
    const body = req.body || {};
    const id = String(body.id || '');
    if (!/^[a-z0-9-]{1,60}$/.test(id) || typeof body.visible !== 'boolean') {
      return reply(context, 400, { error: 'Send { "id": "<brochure id>", "visible": true|false }.' });
    }
    const store = await readStore();
    store.overrides[id] = { visible: body.visible, by: p.userDetails || 'staff', at: new Date().toISOString() };
    await writeStore(store);
    return reply(context, 200, { ok: true, id, override: store.overrides[id] });
  } catch (err) {
    context.log.error(err);
    return reply(context, 502, { error: 'Couldn’t reach the visibility store. Try again in a moment.' });
  }
};
