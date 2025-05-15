import express from 'express'
import * as dressController from '../controllers/dressController'
import * as authController from '../controllers/authController'

const router = express.Router()

// Public routes
router.get('/dresses/:page/:size', dressController.getDresses)
router.get('/dress/:id', dressController.getDress)

// Protected routes
router.post('/dress', authController.authorize, dressController.createDress)
router.put('/dress/:id', authController.authorize, dressController.updateDress)
router.delete('/dress/:id', authController.authorize, dressController.deleteDress)

export default router
