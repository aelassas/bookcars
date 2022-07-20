import express from 'express';
import routeNames from '../config/companyRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import * as companyController from '../controllers/companyController.js';

const routes = express.Router();

routes.route(routeNames.validate).post(authJwt.verifyToken, companyController.validate);
routes.route(routeNames.update).put(authJwt.verifyToken, companyController.update);
routes.route(routeNames.delete).delete(authJwt.verifyToken, companyController.deleteCompany);
routes.route(routeNames.getCompany).get(authJwt.verifyToken, companyController.getCompany);
routes.route(routeNames.getCompanies).get(authJwt.verifyToken, companyController.getCompanies);
routes.route(routeNames.getAllCompanies).get(companyController.getAllCompanies);

export default routes;
