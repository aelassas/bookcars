import express from 'express'
import authJwt from '../middlewares/authJwt'
import * as kycController from '../controllers/kycController'
import multer from 'multer'

const routes = express.Router()
routes.post('/api/kyc', authJwt.verifyToken, kycController.submit)
routes.post('/api/kyc/upload', [
  authJwt.verifyToken,
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  }).fields([
    { name: 'documentFront', maxCount: 1 },
    { name: 'documentBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
], kycController.uploadDocuments)
routes.get('/api/kyc/mine', authJwt.verifyToken, kycController.getMine)
routes.get('/api/kyc/pending', authJwt.verifyToken, authJwt.authAdmin, kycController.getPending)
routes.get('/api/kyc/:id/document/:field', authJwt.verifyToken, authJwt.authAdmin, kycController.getDocument)
routes.post('/api/kyc/:id/review', authJwt.verifyToken, authJwt.authAdmin, kycController.review)

export default routes
