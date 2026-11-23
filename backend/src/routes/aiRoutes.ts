import express from 'express'
import authJwt from '../middlewares/authJwt'
import { createRateLimiter } from '../middlewares/rateLimiter'
import * as aiController from '../controllers/aiController'

const routes = express.Router()

routes.post('/api/ai/parse-trip', createRateLimiter('ai-parse-trip'), aiController.parseTrip)
routes.post('/api/ai/booking-intake', createRateLimiter('ai-booking-intake'), authJwt.verifyToken, authJwt.authSupplier, aiController.bookingIntake)
routes.get('/api/ai/booking-intake-audits/:page/:size', authJwt.verifyToken, authJwt.authAdmin, aiController.getAudits)
routes.post('/api/ai/booking-intake-audits/:id/approve', authJwt.verifyToken, authJwt.authAdmin, aiController.approveAudit)
routes.post('/api/ai/booking-intake-audits/:id/reject', authJwt.verifyToken, authJwt.authAdmin, aiController.rejectAudit)
routes.post('/api/ai/booking-intake-audits/:id/booking-created', authJwt.verifyToken, authJwt.authSupplier, aiController.markBookingCreated)

export default routes
