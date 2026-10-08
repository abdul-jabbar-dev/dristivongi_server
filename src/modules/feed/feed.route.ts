import { Router } from 'express';
import * as feedController from './feed.controller';
import optionalAuth from '../../middlewares/optionalAuth';
import auth from '../../middlewares/auth';

const router = Router();

// Personalized Case Feed (Works with or without authentication, personalized when authenticated)
router.get('/', optionalAuth, feedController.getPersonalizedFeed);

// Interaction & Negative Feedback routes
router.get('/saved', auth, feedController.getSavedCases);
router.post('/cases/:caseId/follow', auth, feedController.toggleFollowCase);
router.post('/cases/:caseId/save', auth, feedController.toggleSaveCase);
router.post('/cases/:caseId/hide', auth, feedController.hideCase);
router.post('/cases/:caseId/not-interested', auth, feedController.markNotInterested);

router.post('/organizations/:organizationId/follow', auth, feedController.toggleFollowOrganization);
router.post('/organizations/:organizationId/mute', auth, feedController.muteOrganization);

export default router;
