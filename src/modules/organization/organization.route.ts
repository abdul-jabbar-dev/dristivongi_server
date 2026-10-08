import express from 'express';
import * as organizationController from './organization.controller';
import validateRequest from '../../middlewares/validateRequest';
import { createOrganizationSchema, updateOrganizationSchema } from './organization.schema';
import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';

const router = express.Router();

// Public routes
router.get('/', organizationController.getPublicOrganizations);
router.get('/slug/:slug', organizationController.getOrganizationBySlug);
router.get('/slug/:slug/context', optionalAuth, organizationController.getOrganizationContext);
router.get('/slug/:slug/feed', organizationController.getOrganizationFeed);

// Authenticated organization CRUD routes
router.post('/', auth, validateRequest(createOrganizationSchema), organizationController.createOrganization);
router.get('/me/memberships', auth, organizationController.getMyOrganizations);
router.get('/my-organizations', auth, organizationController.getMyOrganizations);
router.get('/:id', auth, organizationController.getOrganizationById);
router.patch('/:id', auth, validateRequest(updateOrganizationSchema), organizationController.updateOrganization);

// People / Membership & Stats routes
router.get('/:id/members', optionalAuth, organizationController.getOrganizationMembers);
router.get('/:id/member-stats', optionalAuth, organizationController.getOrganizationMemberStats);
router.get('/:id/admins-moderators', optionalAuth, organizationController.getOrganizationAdminsAndModerators);
router.get('/:id/contributors', optionalAuth, organizationController.getOrganizationContributors);
router.get('/:id/candidate-users', auth, organizationController.searchCandidateUsers);

// Join & Leave routes
router.post('/:id/join', auth, organizationController.joinOrganization);
router.delete('/:id/leave', auth, organizationController.leaveOrganization);

// Member Management & Moderation routes
router.patch('/:id/members/:memberId/role', auth, organizationController.updateMemberRole);
router.patch('/:id/members/:memberId', auth, organizationController.updateMemberRole);
router.delete('/:id/members/:memberId', auth, organizationController.removeMember);
router.patch('/:id/members/:memberId/moderation', auth, organizationController.moderateMember);

// Invitations routes
router.post('/:id/invitations', auth, organizationController.inviteMember);
router.get('/:id/invitations', auth, organizationController.getInvitations);
router.get('/me/invitations', auth, organizationController.getMyInvitations);
router.post('/invitations/:id/accept', auth, organizationController.acceptInvitation);
router.post('/invitations/:id/decline', auth, organizationController.declineInvitation);
router.post('/:id/invitations/:invitationId/cancel', auth, organizationController.cancelInvitation);

// Join Requests routes
router.post('/:id/join-requests', auth, organizationController.requestToJoin);
router.get('/:id/join-requests', auth, organizationController.getJoinRequests);
router.post('/:id/join-requests/:requestId/approve', auth, organizationController.approveJoinRequest);
router.post('/:id/join-requests/:requestId/reject', auth, organizationController.rejectJoinRequest);

export default router;
