"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const organizationController = __importStar(require("./organization.controller"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const organization_schema_1 = require("./organization.schema");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const optionalAuth_1 = __importDefault(require("../../middlewares/optionalAuth"));
const router = express_1.default.Router();
// Public routes
router.get('/', organizationController.getPublicOrganizations);
router.get('/slug/:slug', organizationController.getOrganizationBySlug);
router.get('/slug/:slug/context', optionalAuth_1.default, organizationController.getOrganizationContext);
router.get('/slug/:slug/feed', organizationController.getOrganizationFeed);
// Authenticated organization CRUD routes
router.post('/', auth_1.default, (0, validateRequest_1.default)(organization_schema_1.createOrganizationSchema), organizationController.createOrganization);
router.get('/me/memberships', auth_1.default, organizationController.getMyOrganizations);
router.get('/my-organizations', auth_1.default, organizationController.getMyOrganizations);
router.get('/:id', auth_1.default, organizationController.getOrganizationById);
router.patch('/:id', auth_1.default, (0, validateRequest_1.default)(organization_schema_1.updateOrganizationSchema), organizationController.updateOrganization);
// People / Membership & Stats routes
router.get('/:id/members', optionalAuth_1.default, organizationController.getOrganizationMembers);
router.get('/:id/member-stats', optionalAuth_1.default, organizationController.getOrganizationMemberStats);
router.get('/:id/admins-moderators', optionalAuth_1.default, organizationController.getOrganizationAdminsAndModerators);
router.get('/:id/contributors', optionalAuth_1.default, organizationController.getOrganizationContributors);
router.get('/:id/candidate-users', auth_1.default, organizationController.searchCandidateUsers);
// Join & Leave routes
router.post('/:id/join', auth_1.default, organizationController.joinOrganization);
router.delete('/:id/leave', auth_1.default, organizationController.leaveOrganization);
// Member Management & Moderation routes
router.patch('/:id/members/:memberId/role', auth_1.default, organizationController.updateMemberRole);
router.patch('/:id/members/:memberId', auth_1.default, organizationController.updateMemberRole);
router.delete('/:id/members/:memberId', auth_1.default, organizationController.removeMember);
router.patch('/:id/members/:memberId/moderation', auth_1.default, organizationController.moderateMember);
// Invitations routes
router.post('/:id/invitations', auth_1.default, organizationController.inviteMember);
router.get('/:id/invitations', auth_1.default, organizationController.getInvitations);
router.get('/me/invitations', auth_1.default, organizationController.getMyInvitations);
router.post('/invitations/:id/accept', auth_1.default, organizationController.acceptInvitation);
router.post('/invitations/:id/decline', auth_1.default, organizationController.declineInvitation);
router.post('/:id/invitations/:invitationId/cancel', auth_1.default, organizationController.cancelInvitation);
// Join Requests routes
router.post('/:id/join-requests', auth_1.default, organizationController.requestToJoin);
router.get('/:id/join-requests', auth_1.default, organizationController.getJoinRequests);
router.post('/:id/join-requests/:requestId/approve', auth_1.default, organizationController.approveJoinRequest);
router.post('/:id/join-requests/:requestId/reject', auth_1.default, organizationController.rejectJoinRequest);
exports.default = router;
