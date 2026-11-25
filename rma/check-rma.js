const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://take:take_dev@127.0.0.1:5434/platform' });
  await c.connect();
  const t = (await c.query("SELECT id FROM tenant WHERE slug='rma'")).rows[0];
  const u = await c.query('SELECT u.email, u.name FROM "user" u JOIN tenant_member m ON m.user_id=u.id WHERE m.tenant_id=$1 ORDER BY u.email', [t.id]);
  const v = (await c.query('SELECT count(*)::int AS n FROM vehicle WHERE tenant_id=$1', [t.id])).rows[0].n;
  const r = (await c.query('SELECT count(*)::int AS n FROM rental WHERE tenant_id=$1', [t.id])).rows[0].n;
  const m = (await c.query('SELECT count(*)::int AS n FROM message WHERE tenant_id=$1', [t.id])).rows[0].n;
  console.log('users:', u.rows);
  console.log('vehicles:', v, 'rentals:', r, 'messages:', m);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
