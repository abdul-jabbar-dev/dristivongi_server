import { Request, Response } from 'express';
import httpStatus from 'http-status';
import * as organizationService from './organization.service';
import { catchAsync } from '../../utils/catchAsync';
import { toPublicOrganizationDTO, toOwnerOrganizationDTO } from './organization.dto';
import { OrganizationStatus, OrganizationVisibility } from '@prisma/client';
import GlobalError from '../../../error/GlobalError';

export const createOrganization = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const org = await organizationService.createOrganization(userId, req.body);
  res.status(httpStatus.CREATED).json({ success: true, data: toOwnerOrganizationDTO(org) });
});

export const getPublicOrganizations = catchAsync(async (req: Request, res: Response) => {
  const orgs = await organizationService.getPublicOrganizations(req.query);
  res.status(httpStatus.OK).json({ success: true, data: orgs.map(toPublicOrganizationDTO) });
});

export const getOrganizationBySlug = catchAsync(async (req: Request, res: Response) => {
  const org = await organizationService.getOrganizationBySlug(req.params.slug);

  if (org.status !== OrganizationStatus.ACTIVE || org.visibility !== OrganizationVisibility.PUBLIC) {
    return GlobalError(res, null, 'Organization not found', 404);
  }

  res.status(httpStatus.OK).json({ success: true, data: toPublicOrganizationDTO(org) });
});

export const getOrganizationContext = catchAsync(async (req: Request, res: Response) => {
  const slugOrId = req.params.slug || req.params.id;
  const context = await organizationService.getOrganizationContext(slugOrId, req.user?.id);

  if (
    context.organization.status !== OrganizationStatus.ACTIVE ||
    (context.organization.visibility !== OrganizationVisibility.PUBLIC && !context.viewer.isMember)
  ) {
    return GlobalError(res, null, 'Organization not found or private', 404);
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      organization: context.viewer.isMember
        ? toOwnerOrganizationDTO(context.organization)
        : toPublicOrganizationDTO(context.organization),
      viewer: context.viewer,
    },
  });
});

export const getOrganizationById = catchAsync(async (req: Request, res: Response) => {
  const org = await organizationService.getOrganizationById(req.params.id, req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: toOwnerOrganizationDTO(org) });
});

export const getMyOrganizations = catchAsync(async (req: Request, res: Response) => {
  const memberships = await organizationService.getUserOrganizations(req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: memberships });
});

export const getOrganizationFeed = catchAsync(async (req: Request, res: Response) => {
  const slugOrId = req.params.slug || req.params.id;
  const feed = await organizationService.getOrganizationFeed(slugOrId, req.query.cursor as string);
  res.status(httpStatus.OK).json({ success: true, data: feed });
});

export const updateOrganization = catchAsync(async (req: Request, res: Response) => {
  const org = await organizationService.updateOrganization(req.params.id, req.user!.id, req.body);
  res.status(httpStatus.OK).json({ success: true, data: toOwnerOrganizationDTO(org) });
});

// ==========================================
// PEOPLE / MEMBERS CONTROLLERS
// ==========================================

export const getOrganizationMembers = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const filter = {
    search: req.query.search as string || req.query.q as string,
    role: req.query.role as string,
    tab: req.query.tab as any,
    moderationStatus: req.query.moderationStatus as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = await organizationService.getOrganizationMembers(idOrSlug, filter, req.user?.id);
  res.status(httpStatus.OK).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
});

export const getOrganizationMemberStats = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const stats = await organizationService.getOrganizationMemberStats(idOrSlug, req.user?.id);
  res.status(httpStatus.OK).json({ success: true, data: stats });
});

export const getOrganizationAdminsAndModerators = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const list = await organizationService.getOrganizationAdminsAndModerators(idOrSlug);
  res.status(httpStatus.OK).json({ success: true, data: list });
});

export const getOrganizationContributors = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const list = await organizationService.getOrganizationTopContributors(idOrSlug, limit);
  res.status(httpStatus.OK).json({ success: true, data: list });
});

export const joinOrganization = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const membership = await organizationService.joinOrganization(idOrSlug, req.user!.id);
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Successfully joined organization',
    data: membership,
  });
});

export const leaveOrganization = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const result = await organizationService.leaveOrganization(idOrSlug, req.user!.id);
  res.status(httpStatus.OK).json({ success: true, message: result.message });
});

export const inviteMember = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const invitation = await organizationService.inviteMember(idOrSlug, req.user!.id, {
    emailOrUsername: req.body.email || req.body.emailOrUsername || req.body.username,
    role: req.body.role,
  });
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Invitation sent successfully',
    data: invitation,
  });
});

export const getInvitations = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const invitations = await organizationService.getOrganizationInvitations(idOrSlug, req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: invitations });
});

export const getMyInvitations = catchAsync(async (req: Request, res: Response) => {
  const invitations = await organizationService.getMyInvitations(req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: invitations });
});

export const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const membership = await organizationService.acceptInvitation(req.params.id, req.user!.id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Invitation accepted',
    data: membership,
  });
});

export const declineInvitation = catchAsync(async (req: Request, res: Response) => {
  const invitation = await organizationService.declineInvitation(req.params.id, req.user!.id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Invitation declined',
    data: invitation,
  });
});

export const cancelInvitation = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const invitationId = req.params.invitationId;
  const invitation = await organizationService.cancelInvitation(idOrSlug, invitationId, req.user!.id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Invitation cancelled',
    data: invitation,
  });
});

export const requestToJoin = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const joinRequest = await organizationService.requestToJoin(idOrSlug, req.user!.id, req.body.message);
  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Join request submitted successfully',
    data: joinRequest,
  });
});

export const getJoinRequests = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const requests = await organizationService.getJoinRequests(idOrSlug, req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: requests });
});

export const approveJoinRequest = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const requestId = req.params.requestId;
  const result = await organizationService.approveJoinRequest(idOrSlug, requestId, req.user!.id);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Join request approved',
    data: result,
  });
});

export const rejectJoinRequest = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const requestId = req.params.requestId;
  const result = await organizationService.rejectJoinRequest(
    idOrSlug,
    requestId,
    req.user!.id,
    req.body.reason
  );
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Join request rejected',
    data: result,
  });
});

export const updateMemberRole = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const memberId = req.params.memberId;
  const role = req.body.role;
  const result = await organizationService.updateMemberRole(idOrSlug, memberId, req.user!.id, role);
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Member role updated successfully',
    data: result,
  });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const memberId = req.params.memberId;
  const result = await organizationService.removeMember(idOrSlug, memberId, req.user!.id);
  res.status(httpStatus.OK).json({ success: true, message: result.message });
});

export const moderateMember = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const memberId = req.params.memberId;
  const { action, reason } = req.body;
  const result = await organizationService.moderateMember(
    idOrSlug,
    memberId,
    req.user!.id,
    action,
    reason
  );
  res.status(httpStatus.OK).json({
    success: true,
    message: `Member ${action.toLowerCase()}ed successfully`,
    data: result,
  });
});

export const searchCandidateUsers = catchAsync(async (req: Request, res: Response) => {
  const idOrSlug = req.params.id || req.params.slug;
  const query = (req.query.q as string) || (req.query.search as string) || '';
  const candidates = await organizationService.searchCandidateUsers(idOrSlug, req.user!.id, query);
  res.status(httpStatus.OK).json({ success: true, data: candidates });
});
