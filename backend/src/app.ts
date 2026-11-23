import * as Sentry from '@sentry/node'
import express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import nocache from 'nocache'
import cookieParser from 'cookie-parser'
import i18n from './lang/i18n'
import * as env from './config/env.config'
import cors from './middlewares/cors'
import allowedMethods from './middlewares/allowedMethods'
import supplierRoutes from './routes/supplierRoutes'
import bookingRoutes from './routes/bookingRoutes'
import locationRoutes from './routes/locationRoutes'
import notificationRoutes from './routes/notificationRoutes'
import carRoutes from './routes/carRoutes'
import userRoutes from './routes/userRoutes'
import stripeRoutes from './routes/stripeRoutes'
import countryRoutes from './routes/countryRoutes'
import paypalRoutes from './routes/paypalRoutes'
import ipinfoRoutes from './routes/ipinfoRoutes'
import bankDetailsRoutes from './routes/bankDetailsRoutes'
import settingRoutes from './routes/settingRoutes'
import aiRoutes from './routes/aiRoutes'
import maintenanceRoutes from './routes/maintenanceRoutes'
import vehicleDocumentRoutes from './routes/vehicleDocumentRoutes'
import operationsDashboardRoutes from './routes/operationsDashboardRoutes'
import demoPaymentRoutes from './routes/demoPaymentRoutes'
import * as helper from './utils/helper'

const app = express()

app.set('trust proxy' , 1)

app.use(helmet.contentSecurityPolicy())
app.use(helmet.dnsPrefetchControl())
app.use(helmet.crossOriginEmbedderPolicy())
app.use(helmet.frameguard())
app.use(helmet.hidePoweredBy())
app.use(helmet.hsts())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.referrerPolicy())
app.use(helmet.xssFilter())
app.use(helmet.originAgentCluster())
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }))
app.use(helmet.crossOriginOpenerPolicy())

app.use(nocache())
app.use(compression({ threshold: 0 }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.json({ limit: '50mb' }))

app.use(cors())
// app.options('*', cors())
app.use(cookieParser(env.COOKIE_SECRET))
app.use(allowedMethods)

// Serve static files from the CDN directory
app.use('/cdn', express.static(env.CDN_ROOT))

app.get('/', (_req, res) => {
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafarRent API Engine | Pakistan Vehicle Rental Operations</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: radial-gradient(circle at top, #1e293b 0%, #0f172a 50%, #0b0f19 100%); color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: rgba(30, 41, 59, 0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 20px; padding: 40px; max-width: 680px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(245, 158, 11, 0.14); border: 1px solid #d97706; color: #fde68a; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-bottom: 20px; }
    .dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 10px #f59e0b; }
    h1 { font-size: 30px; font-weight: 800; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.5px; }
    .subtitle { color: #cbd5e1; font-size: 15px; margin-bottom: 28px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 30px; }
    .tile { background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 16px; }
    .tile-lbl { font-size: 11px; text-transform: uppercase; color: #f59e0b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
    .tile-val { font-size: 14px; color: #f1f5f9; font-weight: 500; word-break: break-all; }
    .tile-val a { color: #fcd34d; text-decoration: none; font-weight: 600; }
    .tile-val a:hover { text-decoration: underline; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0f172a; padding: 12px 22px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4); }
    .btn:hover { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); transform: translateY(-1px); }
    .btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: none; color: #e2e8f0; }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.14); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> SafarRent API Engine Online</div>
    <h1>SafarRent Operations API</h1>
    <p class="subtitle">Pakistan Vehicle Rental Platform • Operations, Fleet KPIs &amp; RentOps AI Engine</p>
    <div class="grid">
      <div class="tile">
        <div class="tile-lbl">Customer Web Portal</div>
        <div class="tile-val"><a href="http://localhost:8080" target="_blank">http://localhost:8080 &rarr;</a></div>
      </div>
      <div class="tile">
        <div class="tile-lbl">Admin &amp; Operations Portal</div>
        <div class="tile-val"><a href="http://localhost:3001/operations" target="_blank">http://localhost:3001/operations &rarr;</a></div>
      </div>
      <div class="tile">
        <div class="tile-lbl">Pakistan Operations API</div>
        <div class="tile-val"><code>/api/operations-dashboard</code></div>
      </div>
      <div class="tile">
        <div class="tile-lbl">RentOps AI Intake API</div>
        <div class="tile-val"><code>/api/ai/booking-intake</code></div>
      </div>
    </div>
    <div class="actions">
      <a href="http://localhost:8080" class="btn">Launch Customer Portal</a>
      <a href="http://localhost:3001/operations" class="btn btn-secondary">Open Admin Dashboard</a>
    </div>
  </div>
</body>
</html>`)
})

app.use('/', supplierRoutes)
app.use('/', bookingRoutes)
app.use('/', locationRoutes)
app.use('/', notificationRoutes)
app.use('/', carRoutes)
app.use('/', userRoutes)
app.use('/', stripeRoutes)
app.use('/', countryRoutes)
app.use('/', paypalRoutes)
app.use('/', ipinfoRoutes)
app.use('/', bankDetailsRoutes)
app.use('/', settingRoutes)
app.use('/', aiRoutes)
app.use('/', maintenanceRoutes)
app.use('/', vehicleDocumentRoutes)
app.use('/', operationsDashboardRoutes)
app.use('/', demoPaymentRoutes)

if (env.ENABLE_SENTRY) {
  Sentry.setupExpressErrorHandler(app)
}

i18n.locale = env.DEFAULT_LANGUAGE

await helper.mkdir(env.CDN_USERS)
await helper.mkdir(env.CDN_TEMP_USERS)
await helper.mkdir(env.CDN_CARS)
await helper.mkdir(env.CDN_TEMP_CARS)
await helper.mkdir(env.CDN_LOCATIONS)
await helper.mkdir(env.CDN_TEMP_LOCATIONS)
await helper.mkdir(env.CDN_CONTRACTS)
await helper.mkdir(env.CDN_TEMP_CONTRACTS)
await helper.mkdir(env.CDN_LICENSES)
await helper.mkdir(env.CDN_TEMP_LICENSES)

export default app
