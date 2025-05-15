import express from 'express'
import userRoutes from './userRoutes'
import dressRoutes from './dressRoutes' // Changed from carRoutes
import bookingRoutes from './bookingRoutes'
import locationRoutes from './locationRoutes'
import notificationRoutes from './notificationRoutes'
import paymentRoutes from './paymentRoutes'

const router = express.Router()

// Register all routes
router.use(userRoutes)
router.use(dressRoutes) // Changed from carRoutes
router.use(bookingRoutes)
router.use(locationRoutes)
router.use(notificationRoutes)
router.use(paymentRoutes)

export default router
