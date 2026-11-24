/* Local evaluation only. Uses existing dependencies and removes only its own bookings. */
const mongoose = require('mongoose')
const assert = require('node:assert/strict')
const fs = require('node:fs')
require('dotenv').config()
const origin = process.env.EVALUATION_API || 'http://localhost:4002'
const checks = [], created = []
const cookies = {}
async function api(role, route, body, method = 'POST') {
  // Exercise the real limiter without exhausting the shared local IP bucket.
  await new Promise(resolve => setTimeout(resolve, 2100))
  const started = performance.now()
  const response = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', Origin: role === 'customer' ? 'http://localhost:8080' : 'http://localhost:3001', ...(cookies[role] ? { Cookie: cookies[role] } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) })
  const setCookies = response.headers.getSetCookie()
  if (setCookies.length) {
    // Sign-in clears and then sets the same cookie. Keep the last value, as a browser does.
    const jar = new Map((cookies[role] || '').split('; ').filter(Boolean).map(c => [c.slice(0, c.indexOf('=')), c]))
    for (const cookie of setCookies) {
      const pair = cookie.split(';')[0]
      jar.set(pair.slice(0, pair.indexOf('=')), pair)
    }
    cookies[role] = [...jar.values()].join('; ')
  }
  const raw = await response.text()
  let data; try { data = JSON.parse(raw) } catch { data = raw }
  return { status: response.status, data, ms: Math.round(performance.now() - started) }
}
async function check(name, action) {
  try { const details = await action(); checks.push({ name, pass: true, details }); console.log('PASS', name) }
  catch (error) { checks.push({ name, pass: false, error: error.message }); console.log('FAIL', name, error.message) }
}
async function main() {
  assert.match(process.env.BC_DB_URI || '', /127\.0\.0\.1|localhost/)
  await mongoose.connect(process.env.BC_DB_URI)
  const db = mongoose.connection.db
  const customer = await db.collection('User').findOne({ email: 'demo-customer@safarrent.local' })
  const supplier = await db.collection('User').findOne({ email: 'margalla@safarrent.pk' })
  const car = await db.collection('Car').findOne({ supplier: supplier._id, licensePlate: 'SR-DEMO-12', listingStatus: 'APPROVED', terrainCapability: 'NORTHERN_MOUNTAINS' })
  const pending = await db.collection('Car').findOne({ listingStatus: 'PENDING_REVIEW', name: /^Demo Review:/ })
  const locations = await db.collection('Location').aggregate([{ $lookup: { from: 'LocationValue', localField: 'values', foreignField: '_id', as: 'translations' } }]).toArray()
  const at = name => locations.find(l => l.translations.some(t => t.language === 'en' && t.value === name))._id.toString()
  const start = new Date(); start.setDate(start.getDate() + 90); start.setHours(10, 0, 0, 0)
  const end = new Date(start.getTime() + 3 * 86400000)
  const dates = { from: start.toISOString(), to: end.toISOString() }
  for (const [role, email] of Object.entries({ admin: 'demo-admin@safarrent.local', customer: customer.email, supplier: supplier.email, other: 'karachi@safarrent.pk' })) {
    await check(`${role} login`, async () => { const r = await api(role, '/api/sign-in/' + (role === 'customer' ? 'frontend' : 'admin'), { email, password: process.env.BC_FYP_DEMO_PASSWORD || 'SafarRent-Demo-2026!', stayConnected: true }); assert.equal(r.status, 200); assert(!JSON.stringify(r.data).includes('password')); return { status: r.status } })
  }
  for (const city of ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Multan', 'Faisalabad', 'Sialkot', 'Gilgit', 'Hunza', 'Skardu', 'Swat', 'Murree', 'Naran']) {
    await check(`search ${city}`, async () => { const r = await api('public', '/api/frontend-cars/1/100', { suppliers: [], pickupLocation: at(city), rentalMode: 'WITH_DRIVER', ...dates }); assert.equal(r.status, 200, JSON.stringify(r.data)); assert(r.data[0]?.resultData?.length > 0); assert(r.data[0].resultData.every(c => c.listingStatus === 'APPROVED')); return { cars: r.data[0].resultData.length, milliseconds: r.ms } })
  }
  await check('AI northern trip with provider fallback', async () => { const r = await api('public', '/api/ai/parse-trip', { request: 'With driver from Islamabad to Hunza on ' + start.toISOString().slice(0, 10) + ' for three days for four people' }); assert.equal(r.status, 200); assert(r.data.extractedData.pickupLocation); assert(r.data.terrainAdvisory); return { provider: r.data.provider, milliseconds: r.ms } })
  const quote = mode => api('customer', '/api/bookings/calculate-quote', { carId: car._id.toString(), ...dates, rentalMode: mode, tripScope: 'NORTHERN_TOUR' })
  await check('PKR quote recalculates driver allowance and total', async () => { const self = await quote('SELF_DRIVE'), chauffeur = await quote('WITH_DRIVER'); assert.equal(self.status, 200); assert.equal(chauffeur.status, 200); assert.equal(self.data.driverAllowancePKR, 0); assert(chauffeur.data.driverAllowancePKR > 0); const q = chauffeur.data; assert.equal(q.totalPayablePKR, q.baseRentPKR + q.driverAllowancePKR + q.outOfCitySurchargePKR + q.securityDepositPKR); return q })
  const payload = mode => ({ booking: { supplier: supplier._id.toString(), car: car._id.toString(), driver: customer._id.toString(), pickupLocation: at('Islamabad'), dropOffLocation: at('Hunza'), ...dates, cancellation: true, rentalMode: mode, tripScope: 'NORTHERN_TOUR', price: 1 }, payLater: true })
  try {
    await check('KYC rejects unverified self-drive', async () => { assert.equal((await api('admin', `/api/users/${customer._id}/kyc`, { status: 'PENDING' }, 'PATCH')).status, 200); const r = await api('customer', '/api/checkout', payload('SELF_DRIVE')); assert.equal(r.status, 403); return { status: r.status } })
    await check('customer cannot approve KYC or vehicle', async () => { assert.equal((await api('customer', `/api/users/${customer._id}/kyc`, { status: 'VERIFIED' }, 'PATCH')).status, 403); assert.equal((await api('customer', `/api/cars/${car._id}/review`, { listingStatus: 'APPROVED' }, 'PATCH')).status, 403) })
    await check('admin approves submitted KYC', async () => { assert.equal((await api('admin', `/api/users/${customer._id}/kyc`, { status: 'VERIFIED' }, 'PATCH')).status, 200) })
    if (pending) await check('admin approval changes listing visibility', async () => { const route = `/api/cars/${pending._id}/review`; assert.equal((await api('admin', route, { listingStatus: 'APPROVED', complianceNotes: 'Evaluation smoke review' }, 'PATCH')).status, 200); const result = await api('public', '/api/frontend-cars/1/100', { suppliers: [], ...dates }); assert(result.data[0].resultData.some(c => c._id === pending._id.toString())); assert.equal((await api('admin', route, { listingStatus: 'SUSPENDED' }, 'PATCH')).status, 200); const suspended = await api('public', '/api/frontend-cars/1/100', { suppliers: [], ...dates }); assert(!suspended.data[0].resultData.some(c => c._id === pending._id.toString())) })
    for (const [i, method] of ['JAZZCASH', 'EASYPAISA', 'RAAST', 'CARD_DEMO'].entries()) {
      await check(`${method} checkout, payment, handover and lifecycle`, async () => {
        const body = payload(i % 2 ? 'SELF_DRIVE' : 'WITH_DRIVER')
        body.booking.from = new Date(start.getTime() + i * 7 * 86400000).toISOString()
        body.booking.to = new Date(end.getTime() + i * 7 * 86400000).toISOString()
        const made = await api('customer', '/api/checkout', body); assert.equal(made.status, 200, JSON.stringify(made.data)); const id = made.data.bookingId; assert(id); created.push(id)
        assert.equal((await api('other', `/api/bookings/${id}/handover`, { fuelLevel: 'Full', odometerStart: 12000, spareTirePresent: true, exteriorNotes: 'Evaluation checklist.' }, 'PATCH')).status, 403)
        const payment = { bookingId: id, paymentMethod: method, mobileNumber: '03005550201', idempotencyKey: `evaluation-${id}` }
        if (i === 0) assert.equal((await api('customer', '/api/payments/demo-confirm', { ...payment, mobileNumber: 'bad' })).status, 400)
        const paid = await api('customer', '/api/payments/demo-confirm', payment); assert.equal(paid.status, 200, JSON.stringify(paid.data)); assert.match(paid.data.reference, /^SR-DEMO-/); assert.equal(paid.data.paymentState, 'CONFIRMED')
        const replay = await api('customer', '/api/payments/demo-confirm', payment); assert.equal(replay.data.reference, paid.data.reference)
        const overlapping = await api('customer', '/api/checkout', body); assert.equal(overlapping.status, 409, 'Paid vehicle must reject overlapping reservations')
        const detail = await api('customer', `/api/booking/${id}/en`, undefined, 'GET'); assert.equal(detail.status, 200); assert.equal(detail.data.price, detail.data.priceBreakdown.totalPayablePkr); assert(!JSON.stringify(detail.data).includes('password'))
        assert.equal((await api('supplier', `/api/bookings/${id}/handover`, { fuelLevel: 'Full', odometerStart: 12000, spareTirePresent: true, exteriorNotes: 'Evaluation checklist.' }, 'PATCH')).status, 200)
        assert.equal((await api('supplier', `/api/bookings/${id}/lifecycle`, { lifecycleStatus: 'IN_PROGRESS' }, 'PATCH')).status, 200)
        assert.equal((await api('supplier', `/api/bookings/${id}/lifecycle`, { lifecycleStatus: 'COMPLETED' }, 'PATCH')).status, 200)
        assert.equal((await api('customer', `/api/cancel-booking/${id}`, {})).status, 409)
        return { reference: paid.data.reference, amount: detail.data.price }
      })
    }
    await check('customer cancellation reflects immediately', async () => { const body = payload('WITH_DRIVER'); body.booking.from = new Date(start.getTime() + 50 * 86400000).toISOString(); body.booking.to = new Date(end.getTime() + 50 * 86400000).toISOString(); const made = await api('customer', '/api/checkout', body); assert.equal(made.status, 200); const id = made.data.bookingId; created.push(id); assert.equal((await api('customer', `/api/cancel-booking/${id}`, {})).status, 200); const detail = await api('customer', `/api/booking/${id}/en`, undefined, 'GET'); assert.equal(detail.data.lifecycleStatus, 'CANCELLED'); assert.equal((await api('customer', '/api/payments/demo-confirm', { bookingId: id, paymentMethod: 'RAAST', idempotencyKey: `cancelled-${id}` })).status, 409) })
    await check('supplier fleet remains tenant isolated', async () => { const r = await api('supplier', '/api/cars/1/100', { suppliers: [], keyword: '' }); assert.equal(r.status, 200); assert(r.data[0].resultData.every(c => (c.supplier?._id || c.supplier) === supplier._id.toString())) })
  } finally {
    if (created.length) await api('admin', '/api/delete-bookings', created)
    if (pending) await api('admin', `/api/cars/${pending._id}/review`, { listingStatus: pending.listingStatus, complianceNotes: pending.complianceNotes || '' }, 'PATCH')
    await api('admin', `/api/users/${customer._id}/kyc`, { status: customer.kycStatus }, 'PATCH')
    fs.writeFileSync('evaluation-smoke-results.json', JSON.stringify({ generatedAt: new Date(), checks }, null, 2))
    await mongoose.disconnect()
  }
  if (checks.some(c => !c.pass)) process.exitCode = 1
}
main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1 })
