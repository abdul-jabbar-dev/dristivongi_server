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
exports.searchCandidateUsers = exports.moderateMember = exports.removeMember = exports.updateMemberRole = exports.rejectJoinRequest = exports.approveJoinRequest = exports.getJoinRequests = exports.requestToJoin = exports.cancelInvitation = exports.declineInvitation = exports.acceptInvitation = exports.getMyInvitations = exports.getInvitations = exports.inviteMember = exports.leaveOrganization = exports.joinOrganization = exports.getOrganizationContributors = exports.getOrganizationAdminsAndModerators = exports.getOrganizationMemberStats = exports.getOrganizationMembers = exports.updateOrganization = exports.getOrganizationFeed = exports.getMyOrganizations = exports.getOrganizationById = exports.getOrganizationContext = exports.getOrganizationBySlug = exports.getPublicOrganizations = exports.createOrganization = void 0;
const http_status_1 = __importDefault(require("http-status"));
const organizationService = __importStar(require("./organization.service"));
const catchAsync_1 = require("../../utils/catchAsync");
const organization_dto_1 = require("./organization.dto");
const client_1 = require("@prisma/client");
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
exports.createOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user.id;
    const org = await organizationService.createOrganization(userId, req.body);
    res.status(http_status_1.default.CREATED).json({ success: true, data: (0, organization_dto_1.toOwnerOrganizationDTO)(org) });
});
exports.getPublicOrganizations = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const orgs = await organizationService.getPublicOrganizations(req.query);
    res.status(http_status_1.default.OK).json({ success: true, data: orgs.map(organization_dto_1.toPublicOrganizationDTO) });
});
exports.getOrganizationBySlug = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const org = await organizationService.getOrganizationBySlug(req.params.slug);
    if (org.status !== client_1.OrganizationStatus.ACTIVE || org.visibility !== client_1.OrganizationVisibility.PUBLIC) {
        return (0, GlobalError_1.default)(res, null, 'Organization not found', 404);
    }
    res.status(http_status_1.default.OK).json({ success: true, data: (0, organization_dto_1.toPublicOrganizationDTO)(org) });
});
exports.getOrganizationContext = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const slugOrId = req.params.slug || req.params.id;
    const context = await organizationService.getOrganizationContext(slugOrId, req.user?.id);
    if (context.organization.status !== client_1.OrganizationStatus.ACTIVE ||
        (context.organization.visibility !== client_1.OrganizationVisibility.PUBLIC && !context.viewer.isMember)) {
        return (0, GlobalError_1.default)(res, null, 'Organization not found or private', 404);
    }
    res.status(http_status_1.default.OK).json({
        success: true,
        data: {
            organization: context.viewer.isMember
                ? (0, organization_dto_1.toOwnerOrganizationDTO)(context.organization)
                : (0, organization_dto_1.toPublicOrganizationDTO)(context.organization),
            viewer: context.viewer,
        },
    });
});
exports.getOrganizationById = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const org = await organizationService.getOrganizationById(req.params.id, req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, data: (0, organization_dto_1.toOwnerOrganizationDTO)(org) });
});
exports.getMyOrganizations = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const memberships = await organizationService.getUserOrganizations(req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, data: memberships });
});
exports.getOrganizationFeed = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const slugOrId = req.params.slug || req.params.id;
    const feed = await organizationService.getOrganizationFeed(slugOrId, req.query.cursor);
    res.status(http_status_1.default.OK).json({ success: true, data: feed });
});
exports.updateOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const org = await organizationService.updateOrganization(req.params.id, req.user.id, req.body);
    res.status(http_status_1.default.OK).json({ success: true, data: (0, organization_dto_1.toOwnerOrganizationDTO)(org) });
});
// ==========================================
// PEOPLE / MEMBERS CONTROLLERS
// ==========================================
exports.getOrganizationMembers = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const filter = {
        search: req.query.search || req.query.q,
        role: req.query.role,
        tab: req.query.tab,
        moderationStatus: req.query.moderationStatus,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    };
    const result = await organizationService.getOrganizationMembers(idOrSlug, filter, req.user?.id);
    res.status(http_status_1.default.OK).json({
        success: true,
        data: result.items,
        meta: result.meta,
    });
});
exports.getOrganizationMemberStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const stats = await organizationService.getOrganizationMemberStats(idOrSlug, req.user?.id);
    res.status(http_status_1.default.OK).json({ success: true, data: stats });
});
exports.getOrganizationAdminsAndModerators = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const list = await organizationService.getOrganizationAdminsAndModerators(idOrSlug);
    res.status(http_status_1.default.OK).json({ success: true, data: list });
});
exports.getOrganizationContributors = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const list = await organizationService.getOrganizationTopContributors(idOrSlug, limit);
    res.status(http_status_1.default.OK).json({ success: true, data: list });
});
exports.joinOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const membership = await organizationService.joinOrganization(idOrSlug, req.user.id);
    res.status(http_status_1.default.CREATED).json({
        success: true,
        message: 'Successfully joined organization',
        data: membership,
    });
});
exports.leaveOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const result = await organizationService.leaveOrganization(idOrSlug, req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, message: result.message });
});
exports.inviteMember = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const invitation = await organizationService.inviteMember(idOrSlug, req.user.id, {
        emailOrUsername: req.body.email || req.body.emailOrUsername || req.body.username,
        role: req.body.role,
    });
    res.status(http_status_1.default.CREATED).json({
        success: true,
        message: 'Invitation sent successfully',
        data: invitation,
    });
});
exports.getInvitations = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const invitations = await organizationService.getOrganizationInvitations(idOrSlug, req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, data: invitations });
});
exports.getMyInvitations = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const invitations = await organizationService.getMyInvitations(req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, data: invitations });
});
exports.acceptInvitation = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const membership = await organizationService.acceptInvitation(req.params.id, req.user.id);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Invitation accepted',
        data: membership,
    });
});
exports.declineInvitation = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const invitation = await organizationService.declineInvitation(req.params.id, req.user.id);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Invitation declined',
        data: invitation,
    });
});
exports.cancelInvitation = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const invitationId = req.params.invitationId;
    const invitation = await organizationService.cancelInvitation(idOrSlug, invitationId, req.user.id);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Invitation cancelled',
        data: invitation,
    });
});
exports.requestToJoin = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const joinRequest = await organizationService.requestToJoin(idOrSlug, req.user.id, req.body.message);
    res.status(http_status_1.default.CREATED).json({
        success: true,
        message: 'Join request submitted successfully',
        data: joinRequest,
    });
});
exports.getJoinRequests = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const requests = await organizationService.getJoinRequests(idOrSlug, req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, data: requests });
});
exports.approveJoinRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const requestId = req.params.requestId;
    const result = await organizationService.approveJoinRequest(idOrSlug, requestId, req.user.id);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Join request approved',
        data: result,
    });
});
exports.rejectJoinRequest = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const requestId = req.params.requestId;
    const result = await organizationService.rejectJoinRequest(idOrSlug, requestId, req.user.id, req.body.reason);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Join request rejected',
        data: result,
    });
});
exports.updateMemberRole = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const memberId = req.params.memberId;
    const role = req.body.role;
    const result = await organizationService.updateMemberRole(idOrSlug, memberId, req.user.id, role);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: 'Member role updated successfully',
        data: result,
    });
});
exports.removeMember = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const memberId = req.params.memberId;
    const result = await organizationService.removeMember(idOrSlug, memberId, req.user.id);
    res.status(http_status_1.default.OK).json({ success: true, message: result.message });
});
exports.moderateMember = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const memberId = req.params.memberId;
    const { action, reason } = req.body;
    const result = await organizationService.moderateMember(idOrSlug, memberId, req.user.id, action, reason);
    res.status(http_status_1.default.OK).json({
        success: true,
        message: `Member ${action.toLowerCase()}ed successfully`,
        data: result,
    });
});
exports.searchCandidateUsers = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const idOrSlug = req.params.id || req.params.slug;
    const query = req.query.q || req.query.search || '';
    const candidates = await organizationService.searchCandidateUsers(idOrSlug, req.user.id, query);
    res.status(http_status_1.default.OK).json({ success: true, data: candidates });
});
