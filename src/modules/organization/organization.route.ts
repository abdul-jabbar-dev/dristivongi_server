import express from 'express';
import * as organizationController from './organization.controller';
import validateRequest from '../../middlewares/validateRequest';
import { createOrganizationSchema } from './organization.schema';
import auth from '../../middlewares/auth';

const router = express.Router();

// Public routes
router.get('/', organizationController.getPublicOrganizations);
router.get('/slug/:slug', organizationController.getOrganizationBySlug);

// Authenticated routes
router.post('/', auth, validateRequest(createOrganizationSchema), organizationController.createOrganization);
router.get('/me/memberships', auth, organizationController.getMyOrganizations);
router.get('/:id', auth, organizationController.getOrganizationById);

export default router;
