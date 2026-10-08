import { db as prisma } from '../../../lib/prisma';
import slugify from 'slugify';
import {
  OrganizationStatus,
  OrganizationVisibility,
  OrganizationVerificationStatus,
  OrganizationRole,
  InvitationStatus,
  JoinRequestStatus,
  MembershipModerationStatus,
} from '@prisma/client';
import {
  getOrganizationPermissions,
  canManageTargetMember,
  canAssignRole,
} from './organizationPermissions';

/**
 * Helper to find organization by ID or slug
 */
export const resolveOrganization = async (idOrSlug: string) => {
  const isCuid = idOrSlug.length > 20 && !idOrSlug.includes('-');
  let org = await prisma.organization.findFirst({
    where: isCuid ? { id: idOrSlug } : { slug: idOrSlug },
  });

  if (!org) {
    org = await prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
  }

  if (!org) {
    throw new Error('Organization not found');
  }

  return org;
};

/**
 * Helper to calculate safe civic contributions for a user
 * Note: Never includes anonymous contributions to preserve privacy!
 */
export const calculateUserContributions = async (userId: string, orgId?: string) => {
  const [casesCount, claimsCount, evidenceCount, sourcesCount, discussionsCount] = await Promise.all([
    prisma.case.count({ where: { authorId: userId, isAnonymous: false } }),
    prisma.claim.count({ where: { createdBy: userId, isAnonymous: false } }),
    prisma.evidence.count({ where: { submittedBy: userId, isAnonymous: false } }),
    prisma.source.count({ where: { createdBy: userId, isAnonymous: false } }),
    prisma.discussion.count({ where: { userId: userId, isAnonymous: false } }),
  ]);

  const total = casesCount + claimsCount + evidenceCount + sourcesCount + discussionsCount;

  return {
    total,
    cases: casesCount,
    claims: claimsCount,
    evidence: evidenceCount,
    sources: sourcesCount,
    discussions: discussionsCount,
  };
};

export const createOrganization = async (userId: string, data: any) => {
  const slug = slugify(data.name, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 6);

  const status =
    data.visibility === OrganizationVisibility.PRIVATE
      ? OrganizationStatus.PENDING
      : OrganizationStatus.ACTIVE;

  const verificationStatus =
    data.visibility === OrganizationVisibility.PRIVATE
      ? OrganizationVerificationStatus.PENDING_VERIFICATION
      : OrganizationVerificationStatus.UNVERIFIED;

  const organization = await prisma.organization.create({
    data: {
      ...data,
      slug,
      status,
      verificationStatus,
      createdBy: userId,
      memberships: {
        create: {
          userId,
          role: OrganizationRole.OWNER,
        },
      },
    },
  });

  return organization;
};

export const getPublicOrganizations = async (query: any) => {
  const organizations = await prisma.organization.findMany({
    where: {
      status: OrganizationStatus.ACTIVE,
      visibility: OrganizationVisibility.PUBLIC,
    },
    include: {
      _count: {
        select: { memberships: true, officialResponses: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return organizations;
};

export const getOrganizationBySlug = async (slug: string) => {
  return resolveOrganization(slug);
};

export const getOrganizationContext = async (slugOrId: string, userId?: string) => {
  const organization = await resolveOrganization(slugOrId);

  let membership = null;
  if (userId) {
    membership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userName: true,
            userProfile: { select: { profilePicture: true } },
          },
        },
      },
    });
  }

  const isPublic = organization.visibility === OrganizationVisibility.PUBLIC;
  const permissions = getOrganizationPermissions(
    membership
      ? {
          role: membership.role,
          moderationStatus: membership.moderationStatus,
        }
      : null,
    isPublic
  );

  const viewer = {
    isAuthenticated: !!userId,
    isMember: !!membership && membership.moderationStatus !== 'BANNED',
    membershipId: membership?.id || null,
    role: membership?.role || null,
    moderationStatus: membership?.moderationStatus || null,
    isOwner: membership?.role === OrganizationRole.OWNER,
    isAdmin: membership?.role === OrganizationRole.OWNER || membership?.role === OrganizationRole.ADMIN,
    isModerator: membership?.role === OrganizationRole.MODERATOR,
    permissions,
  };

  const counts = await prisma.organizationMembership.groupBy({
    by: ['role'],
    where: {
      organizationId: organization.id,
      moderationStatus: { not: 'BANNED' },
    },
    _count: {
      _all: true,
    },
  });

  const totalMembers = counts.reduce((acc, c) => acc + c._count._all, 0);

  return {
    organization: {
      ...organization,
      _count: {
        memberships: totalMembers,
      },
    },
    viewer,
  };
};

export const getOrganizationById = async (id: string, userId: string) => {
  return resolveOrganization(id);
};

export const getUserOrganizations = async (userId: string) => {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      moderationStatus: { not: 'BANNED' },
    },
    include: {
      organization: true,
    },
  });

  return memberships;
};

export const getOrganizationFeed = async (slugOrId: string, cursor?: string) => {
  const organization = await resolveOrganization(slugOrId);

  const limit = 20;
  const cases = await prisma.officialResponse.findMany({
    where: { organizationId: organization.id },
    include: {
      case: {
        include: {
          author: {
            select: { id: true, fullName: true, userProfile: { select: { profilePicture: true } } },
          },
          _count: {
            select: {
              evidence: true,
              sources: true,
              discussions: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  let nextCursor: string | undefined = undefined;
  if (cases.length > limit) {
    const nextItem = cases.pop();
    nextCursor = nextItem!.id;
  }

  const items = cases.map((oc) => ({
    id: oc.id,
    type: 'OFFICIAL_RESPONSE',
    timestamp: oc.createdAt,
    case: oc.case,
  }));

  return {
    items,
    pagination: {
      nextCursor,
      hasMore: !!nextCursor,
    },
  };
};

export const updateOrganization = async (id: string, userId: string, data: any) => {
  const org = await resolveOrganization(id);
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId,
      },
    },
  });

  if (!membership || (membership.role !== OrganizationRole.OWNER && membership.role !== OrganizationRole.ADMIN)) {
    throw new Error('Unauthorized to update organization');
  }

  const organization = await prisma.organization.update({
    where: { id: org.id },
    data,
  });

  return organization;
};

// ==========================================
// PEOPLE / MEMBERS SYSTEM IMPLEMENTATION
// ==========================================

export interface GetMembersFilter {
  search?: string;
  role?: string;
  tab?: 'all' | 'admins' | 'contributors' | 'moderators';
  moderationStatus?: string;
  page?: number;
  limit?: number;
}

export const getOrganizationMembers = async (
  idOrSlug: string,
  filter: GetMembersFilter = {},
  currentUserId?: string
) => {
  const org = await resolveOrganization(idOrSlug);

  // Check viewer permissions for private org
  if (org.visibility === OrganizationVisibility.PRIVATE) {
    if (!currentUserId) {
      throw new Error('Unauthorized: This organization is private');
    }
    const viewerMembership = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: currentUserId } },
    });
    if (!viewerMembership || viewerMembership.moderationStatus === 'BANNED') {
      throw new Error('Unauthorized: You are not a member of this private organization');
    }
  }

  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    organizationId: org.id,
  };

  // Moderation status filtering
  if (filter.moderationStatus) {
    whereClause.moderationStatus = filter.moderationStatus;
  } else {
    // By default, hide BANNED users from public member list unless viewer is manager
    whereClause.moderationStatus = { not: 'BANNED' };
  }

  // Role / Tab filtering
  if (filter.tab === 'admins') {
    whereClause.role = { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MODERATOR] };
  } else if (filter.tab === 'moderators') {
    whereClause.role = OrganizationRole.MODERATOR;
  } else if (filter.role && Object.values(OrganizationRole).includes(filter.role as any)) {
    whereClause.role = filter.role;
  }

  // Search by name or username
  if (filter.search && filter.search.trim().length > 0) {
    const q = filter.search.trim();
    whereClause.user = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  const [total, memberships] = await Promise.all([
    prisma.organizationMembership.count({ where: whereClause }),
    prisma.organizationMembership.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            userName: true,
            createdAt: true,
            userProfile: {
              select: {
                profilePicture: true,
                bio: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER -> ADMIN -> MODERATOR -> REPRESENTATIVE -> MEMBER
        { createdAt: 'asc' },
      ],
      skip,
      take: limit,
    }),
  ]);

  // Compute contribution metrics for the returned members
  const items = await Promise.all(
    memberships.map(async (m) => {
      const contributions = await calculateUserContributions(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        moderationStatus: m.moderationStatus,
        joinedAt: m.createdAt,
        user: {
          id: m.user.id,
          fullName: m.user.fullName,
          userName: m.user.userName,
          profilePicture: m.user.userProfile?.profilePicture || null,
          bio: m.user.userProfile?.bio || null,
          location: m.user.userProfile?.location || null,
          accountCreated: m.user.createdAt,
        },
        contributions,
      };
    })
  );

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  };
};

export const getOrganizationMemberStats = async (idOrSlug: string, currentUserId?: string) => {
  const org = await resolveOrganization(idOrSlug);

  const [memberships, pendingRequestsCount, pendingInvitationsCount] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: {
        organizationId: org.id,
        moderationStatus: { not: 'BANNED' },
      },
      select: {
        userId: true,
        role: true,
      },
    }),
    prisma.organizationJoinRequest.count({
      where: { organizationId: org.id, status: JoinRequestStatus.PENDING },
    }),
    prisma.organizationInvitation.count({
      where: { organizationId: org.id, status: InvitationStatus.PENDING },
    }),
  ]);

  const totalMembers = memberships.length;
  const adminsCount = memberships.filter(
    (m) => m.role === OrganizationRole.OWNER || m.role === OrganizationRole.ADMIN
  ).length;
  const moderatorsCount = memberships.filter((m) => m.role === OrganizationRole.MODERATOR).length;

  // Calculate real active contributors among members (limit sample for performance)
  let contributorsCount = 0;
  const userIds = memberships.map((m) => m.userId);
  if (userIds.length > 0) {
    const activeAuthors = await prisma.case.groupBy({
      by: ['authorId'],
      where: {
        authorId: { in: userIds },
        isAnonymous: false,
      },
    });
    const activeEvidence = await prisma.evidence.groupBy({
      by: ['submittedBy'],
      where: {
        submittedBy: { in: userIds },
        isAnonymous: false,
      },
    });
    const activeDiscussions = await prisma.discussion.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        isAnonymous: false,
      },
    });

    const activeSet = new Set([
      ...activeAuthors.map((a) => a.authorId),
      ...activeEvidence.map((e) => e.submittedBy),
      ...activeDiscussions.map((d) => d.userId),
    ]);
    contributorsCount = activeSet.size;
  }

  return {
    totalMembers,
    adminsCount,
    moderatorsCount,
    contributorsCount,
    pendingRequestsCount,
    pendingInvitationsCount,
  };
};

export const getOrganizationAdminsAndModerators = async (idOrSlug: string) => {
  const org = await resolveOrganization(idOrSlug);

  const members = await prisma.organizationMembership.findMany({
    where: {
      organizationId: org.id,
      role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
      moderationStatus: { not: 'BANNED' },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          userName: true,
          userProfile: {
            select: {
              profilePicture: true,
              bio: true,
            },
          },
        },
      },
    },
    orderBy: [
      { role: 'asc' }, // OWNER first, then ADMIN, then MODERATOR
      { createdAt: 'asc' },
    ],
  });

  const enriched = await Promise.all(
    members.map(async (m) => {
      const contributions = await calculateUserContributions(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.createdAt,
        user: {
          id: m.user.id,
          fullName: m.user.fullName,
          userName: m.user.userName,
          profilePicture: m.user.userProfile?.profilePicture || null,
          bio: m.user.userProfile?.bio || null,
        },
        contributions,
      };
    })
  );

  return enriched;
};

export const getOrganizationTopContributors = async (idOrSlug: string, limit: number = 10) => {
  const org = await resolveOrganization(idOrSlug);

  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId: org.id,
      moderationStatus: { not: 'BANNED' },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          userName: true,
          userProfile: {
            select: {
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  const memberStats = await Promise.all(
    memberships.map(async (m) => {
      const contributions = await calculateUserContributions(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: {
          id: m.user.id,
          fullName: m.user.fullName,
          userName: m.user.userName,
          profilePicture: m.user.userProfile?.profilePicture || null,
        },
        contributions,
      };
    })
  );

  // Filter only those with at least 1 contribution and sort desc
  const contributors = memberStats
    .filter((m) => m.contributions.total > 0)
    .sort((a, b) => b.contributions.total - a.contributions.total)
    .slice(0, limit);

  return contributors;
};

export const joinOrganization = async (idOrSlug: string, userId: string) => {
  const org = await resolveOrganization(idOrSlug);

  if (org.visibility === OrganizationVisibility.PRIVATE) {
    throw new Error('This organization is private. Please submit a join request instead.');
  }

  // Check if existing membership
  const existing = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId,
      },
    },
  });

  if (existing) {
    if (existing.moderationStatus === 'BANNED') {
      throw new Error('You have been restricted from joining this organization.');
    }
    throw new Error('You are already a member of this organization.');
  }

  const membership = await prisma.organizationMembership.create({
    data: {
      organizationId: org.id,
      userId,
      role: OrganizationRole.MEMBER,
      moderationStatus: MembershipModerationStatus.ACTIVE,
    },
    include: {
      organization: true,
      user: {
        select: { id: true, fullName: true, userName: true },
      },
    },
  });

  // Clean up any pending join request for this user
  await prisma.organizationJoinRequest.updateMany({
    where: {
      organizationId: org.id,
      userId,
      status: JoinRequestStatus.PENDING,
    },
    data: {
      status: JoinRequestStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });

  return membership;
};

export const leaveOrganization = async (idOrSlug: string, userId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error('You are not a member of this organization.');
  }

  // Prevent leaving if user is the ONLY owner
  if (membership.role === OrganizationRole.OWNER) {
    const ownerCount = await prisma.organizationMembership.count({
      where: {
        organizationId: org.id,
        role: OrganizationRole.OWNER,
        userId: { not: userId },
      },
    });

    if (ownerCount === 0) {
      throw new Error(
        'As the sole owner, you cannot leave the organization without transferring ownership or closing the organization.'
      );
    }
  }

  await prisma.organizationMembership.delete({
    where: { id: membership.id },
  });

  return { success: true, message: 'Successfully left the organization' };
};

export const inviteMember = async (
  idOrSlug: string,
  actorUserId: string,
  payload: { emailOrUsername: string; role?: OrganizationRole }
) => {
  const org = await resolveOrganization(idOrSlug);

  // Validate actor permission
  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized: You are not a member of this organization');
  }

  const permissions = getOrganizationPermissions({
    role: actorMembership.role,
    moderationStatus: actorMembership.moderationStatus,
  });

  if (!permissions.inviteMembers) {
    throw new Error('Unauthorized: You do not have permission to invite members');
  }

  const targetRole = payload.role || OrganizationRole.MEMBER;
  if (!canAssignRole(actorMembership.role, targetRole)) {
    throw new Error(`Unauthorized: You cannot invite with role ${targetRole}`);
  }

  const query = payload.emailOrUsername.trim();
  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: query.toLowerCase() }, { userName: query }],
    },
  });

  const emailToInvite = targetUser?.email || query.toLowerCase();

  // Check if target user is already a member
  if (targetUser) {
    const existingMember = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: targetUser.id } },
    });
    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }
  }

  // Check if invitation is already pending
  const existingInvite = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: org.id,
      email: emailToInvite,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingInvite) {
    throw new Error('An invitation is already pending for this user');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: org.id,
      email: emailToInvite,
      invitedBy: actorUserId,
      role: targetRole,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
    include: {
      inviter: {
        select: { id: true, fullName: true, userName: true },
      },
    },
  });

  return invitation;
};

export const getOrganizationInvitations = async (idOrSlug: string, actorUserId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (
    !actorMembership ||
    (actorMembership.role !== OrganizationRole.OWNER &&
      actorMembership.role !== OrganizationRole.ADMIN &&
      actorMembership.role !== OrganizationRole.MODERATOR)
  ) {
    throw new Error('Unauthorized to view invitations');
  }

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: org.id },
    include: {
      inviter: {
        select: { id: true, fullName: true, userName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations;
};

export const getMyInvitations = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      email: user.email,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          description: true,
          visibility: true,
        },
      },
      inviter: {
        select: { id: true, fullName: true, userName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations;
};

export const acceptInvitation = async (invitationId: string, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
    include: { organization: true },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address');
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error(`Invitation is already ${invitation.status.toLowerCase()}`);
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.EXPIRED },
    });
    throw new Error('This invitation has expired');
  }

  // Create membership & mark accepted
  const [membership] = await prisma.$transaction([
    prisma.organizationMembership.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
    }),
    prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.ACCEPTED },
    }),
  ]);

  return membership;
};

export const declineInvitation = async (invitationId: string, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Invitation not found');
  }

  const updated = await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.REJECTED },
  });

  return updated;
};

export const cancelInvitation = async (idOrSlug: string, invitationId: string, actorUserId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (
    !actorMembership ||
    (actorMembership.role !== OrganizationRole.OWNER && actorMembership.role !== OrganizationRole.ADMIN)
  ) {
    throw new Error('Unauthorized to cancel invitation');
  }

  const invitation = await prisma.organizationInvitation.update({
    where: { id: invitationId, organizationId: org.id },
    data: { status: InvitationStatus.CANCELLED },
  });

  return invitation;
};

export const requestToJoin = async (idOrSlug: string, userId: string, message?: string) => {
  const org = await resolveOrganization(idOrSlug);

  // Check if user is already a member
  const existing = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });

  if (existing) {
    throw new Error('You are already a member of this organization');
  }

  // Check existing request
  const existingRequest = await prisma.organizationJoinRequest.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });

  if (existingRequest) {
    if (existingRequest.status === JoinRequestStatus.PENDING) {
      throw new Error('You already have a pending join request for this organization');
    }

    // Reactivate request if previously rejected or cancelled
    const updated = await prisma.organizationJoinRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: JoinRequestStatus.PENDING,
        message,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });
    return updated;
  }

  const joinRequest = await prisma.organizationJoinRequest.create({
    data: {
      organizationId: org.id,
      userId,
      message,
      status: JoinRequestStatus.PENDING,
    },
  });

  return joinRequest;
};

export const getJoinRequests = async (idOrSlug: string, actorUserId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (
    !actorMembership ||
    (actorMembership.role !== OrganizationRole.OWNER &&
      actorMembership.role !== OrganizationRole.ADMIN &&
      actorMembership.role !== OrganizationRole.MODERATOR)
  ) {
    throw new Error('Unauthorized to view join requests');
  }

  const requests = await prisma.organizationJoinRequest.findMany({
    where: { organizationId: org.id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          userName: true,
          createdAt: true,
          userProfile: { select: { profilePicture: true, bio: true } },
        },
      },
      reviewer: {
        select: { id: true, fullName: true, userName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests;
};

export const approveJoinRequest = async (idOrSlug: string, requestId: string, actorUserId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized');
  }

  const permissions = getOrganizationPermissions({
    role: actorMembership.role,
    moderationStatus: actorMembership.moderationStatus,
  });

  if (!permissions.approveJoinRequests) {
    throw new Error('Unauthorized: You do not have permission to approve join requests');
  }

  const request = await prisma.organizationJoinRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.organizationId !== org.id) {
    throw new Error('Join request not found');
  }

  if (request.status !== JoinRequestStatus.PENDING) {
    throw new Error(`Request has already been ${request.status.toLowerCase()}`);
  }

  // Create membership and update request status in transaction
  const [membership, updatedRequest] = await prisma.$transaction([
    prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: request.userId,
        role: OrganizationRole.MEMBER,
        moderationStatus: MembershipModerationStatus.ACTIVE,
      },
      include: {
        user: { select: { id: true, fullName: true, userName: true } },
      },
    }),
    prisma.organizationJoinRequest.update({
      where: { id: requestId },
      data: {
        status: JoinRequestStatus.APPROVED,
        reviewedBy: actorUserId,
        reviewedAt: new Date(),
      },
    }),
  ]);

  return { membership, request: updatedRequest };
};

export const rejectJoinRequest = async (
  idOrSlug: string,
  requestId: string,
  actorUserId: string,
  reason?: string
) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized');
  }

  const permissions = getOrganizationPermissions({
    role: actorMembership.role,
    moderationStatus: actorMembership.moderationStatus,
  });

  if (!permissions.rejectJoinRequests) {
    throw new Error('Unauthorized: You do not have permission to reject join requests');
  }

  const request = await prisma.organizationJoinRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.organizationId !== org.id) {
    throw new Error('Join request not found');
  }

  const updated = await prisma.organizationJoinRequest.update({
    where: { id: requestId },
    data: {
      status: JoinRequestStatus.REJECTED,
      reviewedBy: actorUserId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });

  return updated;
};

export const updateMemberRole = async (
  idOrSlug: string,
  memberId: string,
  actorUserId: string,
  newRole: OrganizationRole
) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized: You are not a member of this organization');
  }

  const targetMember = await prisma.organizationMembership.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== org.id) {
    throw new Error('Member not found in this organization');
  }

  if (targetMember.role === OrganizationRole.OWNER && actorMembership.role !== OrganizationRole.OWNER) {
    throw new Error('Cannot change the role of the organization Owner');
  }

  if (newRole === OrganizationRole.OWNER) {
    throw new Error('Owner assignment is only possible through explicit ownership transfer');
  }

  if (!canManageTargetMember(actorMembership.role, targetMember.role)) {
    throw new Error('You do not have permission to manage this member');
  }

  if (!canAssignRole(actorMembership.role, newRole)) {
    throw new Error(`You do not have permission to assign role ${newRole}`);
  }

  const updated = await prisma.organizationMembership.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      user: {
        select: { id: true, fullName: true, userName: true },
      },
    },
  });

  return updated;
};

export const removeMember = async (idOrSlug: string, memberId: string, actorUserId: string) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized');
  }

  const targetMember = await prisma.organizationMembership.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== org.id) {
    throw new Error('Member not found in this organization');
  }

  if (targetMember.role === OrganizationRole.OWNER) {
    throw new Error('The organization Owner cannot be removed');
  }

  if (!canManageTargetMember(actorMembership.role, targetMember.role)) {
    throw new Error('You do not have permission to remove this member');
  }

  await prisma.organizationMembership.delete({
    where: { id: memberId },
  });

  return { success: true, message: 'Member successfully removed' };
};

export const moderateMember = async (
  idOrSlug: string,
  memberId: string,
  actorUserId: string,
  action: 'RESTRICT' | 'SUSPEND' | 'BAN' | 'UNRESTRICT',
  reason?: string
) => {
  const org = await resolveOrganization(idOrSlug);

  const actorMembership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
  });

  if (!actorMembership) {
    throw new Error('Unauthorized');
  }

  const permissions = getOrganizationPermissions({
    role: actorMembership.role,
    moderationStatus: actorMembership.moderationStatus,
  });

  if (!permissions.moderateMembers) {
    throw new Error('Unauthorized: You do not have moderation permissions');
  }

  const targetMember = await prisma.organizationMembership.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== org.id) {
    throw new Error('Member not found');
  }

  if (targetMember.role === OrganizationRole.OWNER) {
    throw new Error('Cannot moderate the organization Owner');
  }

  if (actorMembership.role === OrganizationRole.MODERATOR && targetMember.role === OrganizationRole.ADMIN) {
    throw new Error('Moderators cannot moderate Admins');
  }

  let newStatus: MembershipModerationStatus = MembershipModerationStatus.ACTIVE;
  if (action === 'RESTRICT') newStatus = MembershipModerationStatus.RESTRICTED;
  else if (action === 'SUSPEND') newStatus = MembershipModerationStatus.SUSPENDED;
  else if (action === 'BAN') newStatus = MembershipModerationStatus.BANNED;
  else if (action === 'UNRESTRICT') newStatus = MembershipModerationStatus.ACTIVE;

  const updated = await prisma.organizationMembership.update({
    where: { id: memberId },
    data: {
      moderationStatus: newStatus,
      moderatedAt: new Date(),
      moderatedBy: actorUserId,
      moderationReason: reason || null,
    },
    include: {
      user: {
        select: { id: true, fullName: true, userName: true },
      },
    },
  });

  return updated;
};

export const searchCandidateUsers = async (idOrSlug: string, actorUserId: string, query: string) => {
  const org = await resolveOrganization(idOrSlug);

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: cleanQuery, mode: 'insensitive' } },
        { userName: { contains: cleanQuery, mode: 'insensitive' } },
        { email: { contains: cleanQuery, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      userName: true,
      email: true,
      userProfile: {
        select: { profilePicture: true },
      },
      organizationMemberships: {
        where: { organizationId: org.id },
        select: { id: true, role: true, moderationStatus: true },
      },
      userJoinRequests: {
        where: { organizationId: org.id, status: JoinRequestStatus.PENDING },
        select: { id: true },
      },
    },
    take: 10,
  });

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId: org.id,
      email: { in: users.map((u) => u.email) },
      status: InvitationStatus.PENDING,
    },
    select: { email: true, id: true },
  });

  const pendingInviteEmails = new Set(invitations.map((i) => i.email.toLowerCase()));

  return users.map((u) => {
    const isMember = u.organizationMemberships.length > 0;
    const isPendingInvite = pendingInviteEmails.has(u.email.toLowerCase());
    const isPendingRequest = u.userJoinRequests.length > 0;

    return {
      id: u.id,
      fullName: u.fullName,
      userName: u.userName,
      profilePicture: u.userProfile?.profilePicture || null,
      isMember,
      memberRole: u.organizationMemberships[0]?.role || null,
      isPendingInvite,
      isPendingRequest,
    };
  });
};
