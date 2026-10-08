"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCandidateUsers = exports.moderateMember = exports.removeMember = exports.updateMemberRole = exports.rejectJoinRequest = exports.approveJoinRequest = exports.getJoinRequests = exports.requestToJoin = exports.cancelInvitation = exports.declineInvitation = exports.acceptInvitation = exports.getMyInvitations = exports.getOrganizationInvitations = exports.inviteMember = exports.leaveOrganization = exports.joinOrganization = exports.getOrganizationTopContributors = exports.getOrganizationAdminsAndModerators = exports.getOrganizationMemberStats = exports.getOrganizationMembers = exports.updateOrganization = exports.getOrganizationFeed = exports.getUserOrganizations = exports.getOrganizationById = exports.getOrganizationContext = exports.getOrganizationBySlug = exports.getPublicOrganizations = exports.createOrganization = exports.calculateUserContributions = exports.resolveOrganization = void 0;
const prisma_1 = require("../../../lib/prisma");
const slugify_1 = __importDefault(require("slugify"));
const client_1 = require("@prisma/client");
const organizationPermissions_1 = require("./organizationPermissions");
/**
 * Helper to find organization by ID or slug
 */
const resolveOrganization = async (idOrSlug) => {
    const isCuid = idOrSlug.length > 20 && !idOrSlug.includes('-');
    let org = await prisma_1.db.organization.findFirst({
        where: isCuid ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) {
        org = await prisma_1.db.organization.findFirst({
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
exports.resolveOrganization = resolveOrganization;
/**
 * Helper to calculate safe civic contributions for a user
 * Note: Never includes anonymous contributions to preserve privacy!
 */
const calculateUserContributions = async (userId, orgId) => {
    const [casesCount, claimsCount, evidenceCount, sourcesCount, discussionsCount] = await Promise.all([
        prisma_1.db.case.count({ where: { authorId: userId, isAnonymous: false } }),
        prisma_1.db.claim.count({ where: { createdBy: userId, isAnonymous: false } }),
        prisma_1.db.evidence.count({ where: { submittedBy: userId, isAnonymous: false } }),
        prisma_1.db.source.count({ where: { createdBy: userId, isAnonymous: false } }),
        prisma_1.db.discussion.count({ where: { userId: userId, isAnonymous: false } }),
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
exports.calculateUserContributions = calculateUserContributions;
const createOrganization = async (userId, data) => {
    const slug = (0, slugify_1.default)(data.name, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 6);
    const status = data.visibility === client_1.OrganizationVisibility.PRIVATE
        ? client_1.OrganizationStatus.PENDING
        : client_1.OrganizationStatus.ACTIVE;
    const verificationStatus = data.visibility === client_1.OrganizationVisibility.PRIVATE
        ? client_1.OrganizationVerificationStatus.PENDING_VERIFICATION
        : client_1.OrganizationVerificationStatus.UNVERIFIED;
    const organization = await prisma_1.db.organization.create({
        data: {
            ...data,
            slug,
            status,
            verificationStatus,
            createdBy: userId,
            memberships: {
                create: {
                    userId,
                    role: client_1.OrganizationRole.OWNER,
                },
            },
        },
    });
    return organization;
};
exports.createOrganization = createOrganization;
const getPublicOrganizations = async (query) => {
    const organizations = await prisma_1.db.organization.findMany({
        where: {
            status: client_1.OrganizationStatus.ACTIVE,
            visibility: client_1.OrganizationVisibility.PUBLIC,
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
exports.getPublicOrganizations = getPublicOrganizations;
const getOrganizationBySlug = async (slug) => {
    return (0, exports.resolveOrganization)(slug);
};
exports.getOrganizationBySlug = getOrganizationBySlug;
const getOrganizationContext = async (slugOrId, userId) => {
    const organization = await (0, exports.resolveOrganization)(slugOrId);
    let membership = null;
    if (userId) {
        membership = await prisma_1.db.organizationMembership.findUnique({
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
    const isPublic = organization.visibility === client_1.OrganizationVisibility.PUBLIC;
    const permissions = (0, organizationPermissions_1.getOrganizationPermissions)(membership
        ? {
            role: membership.role,
            moderationStatus: membership.moderationStatus,
        }
        : null, isPublic);
    const viewer = {
        isAuthenticated: !!userId,
        isMember: !!membership && membership.moderationStatus !== 'BANNED',
        membershipId: membership?.id || null,
        role: membership?.role || null,
        moderationStatus: membership?.moderationStatus || null,
        isOwner: membership?.role === client_1.OrganizationRole.OWNER,
        isAdmin: membership?.role === client_1.OrganizationRole.OWNER || membership?.role === client_1.OrganizationRole.ADMIN,
        isModerator: membership?.role === client_1.OrganizationRole.MODERATOR,
        permissions,
    };
    const counts = await prisma_1.db.organizationMembership.groupBy({
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
exports.getOrganizationContext = getOrganizationContext;
const getOrganizationById = async (id, userId) => {
    return (0, exports.resolveOrganization)(id);
};
exports.getOrganizationById = getOrganizationById;
const getUserOrganizations = async (userId) => {
    const memberships = await prisma_1.db.organizationMembership.findMany({
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
exports.getUserOrganizations = getUserOrganizations;
const getOrganizationFeed = async (slugOrId, cursor) => {
    const organization = await (0, exports.resolveOrganization)(slugOrId);
    const limit = 20;
    const cases = await prisma_1.db.officialResponse.findMany({
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
    let nextCursor = undefined;
    if (cases.length > limit) {
        const nextItem = cases.pop();
        nextCursor = nextItem.id;
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
exports.getOrganizationFeed = getOrganizationFeed;
const updateOrganization = async (id, userId, data) => {
    const org = await (0, exports.resolveOrganization)(id);
    const membership = await prisma_1.db.organizationMembership.findUnique({
        where: {
            organizationId_userId: {
                organizationId: org.id,
                userId,
            },
        },
    });
    if (!membership || (membership.role !== client_1.OrganizationRole.OWNER && membership.role !== client_1.OrganizationRole.ADMIN)) {
        throw new Error('Unauthorized to update organization');
    }
    const organization = await prisma_1.db.organization.update({
        where: { id: org.id },
        data,
    });
    return organization;
};
exports.updateOrganization = updateOrganization;
const getOrganizationMembers = async (idOrSlug, filter = {}, currentUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    // Check viewer permissions for private org
    if (org.visibility === client_1.OrganizationVisibility.PRIVATE) {
        if (!currentUserId) {
            throw new Error('Unauthorized: This organization is private');
        }
        const viewerMembership = await prisma_1.db.organizationMembership.findUnique({
            where: { organizationId_userId: { organizationId: org.id, userId: currentUserId } },
        });
        if (!viewerMembership || viewerMembership.moderationStatus === 'BANNED') {
            throw new Error('Unauthorized: You are not a member of this private organization');
        }
    }
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;
    const whereClause = {
        organizationId: org.id,
    };
    // Moderation status filtering
    if (filter.moderationStatus) {
        whereClause.moderationStatus = filter.moderationStatus;
    }
    else {
        // By default, hide BANNED users from public member list unless viewer is manager
        whereClause.moderationStatus = { not: 'BANNED' };
    }
    // Role / Tab filtering
    if (filter.tab === 'admins') {
        whereClause.role = { in: [client_1.OrganizationRole.OWNER, client_1.OrganizationRole.ADMIN, client_1.OrganizationRole.MODERATOR] };
    }
    else if (filter.tab === 'moderators') {
        whereClause.role = client_1.OrganizationRole.MODERATOR;
    }
    else if (filter.role && Object.values(client_1.OrganizationRole).includes(filter.role)) {
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
        prisma_1.db.organizationMembership.count({ where: whereClause }),
        prisma_1.db.organizationMembership.findMany({
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
    const items = await Promise.all(memberships.map(async (m) => {
        const contributions = await (0, exports.calculateUserContributions)(m.userId);
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
    }));
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
exports.getOrganizationMembers = getOrganizationMembers;
const getOrganizationMemberStats = async (idOrSlug, currentUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const [memberships, pendingRequestsCount, pendingInvitationsCount] = await Promise.all([
        prisma_1.db.organizationMembership.findMany({
            where: {
                organizationId: org.id,
                moderationStatus: { not: 'BANNED' },
            },
            select: {
                userId: true,
                role: true,
            },
        }),
        prisma_1.db.organizationJoinRequest.count({
            where: { organizationId: org.id, status: client_1.JoinRequestStatus.PENDING },
        }),
        prisma_1.db.organizationInvitation.count({
            where: { organizationId: org.id, status: client_1.InvitationStatus.PENDING },
        }),
    ]);
    const totalMembers = memberships.length;
    const adminsCount = memberships.filter((m) => m.role === client_1.OrganizationRole.OWNER || m.role === client_1.OrganizationRole.ADMIN).length;
    const moderatorsCount = memberships.filter((m) => m.role === client_1.OrganizationRole.MODERATOR).length;
    // Calculate real active contributors among members (limit sample for performance)
    let contributorsCount = 0;
    const userIds = memberships.map((m) => m.userId);
    if (userIds.length > 0) {
        const activeAuthors = await prisma_1.db.case.groupBy({
            by: ['authorId'],
            where: {
                authorId: { in: userIds },
                isAnonymous: false,
            },
        });
        const activeEvidence = await prisma_1.db.evidence.groupBy({
            by: ['submittedBy'],
            where: {
                submittedBy: { in: userIds },
                isAnonymous: false,
            },
        });
        const activeDiscussions = await prisma_1.db.discussion.groupBy({
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
exports.getOrganizationMemberStats = getOrganizationMemberStats;
const getOrganizationAdminsAndModerators = async (idOrSlug) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const members = await prisma_1.db.organizationMembership.findMany({
        where: {
            organizationId: org.id,
            role: { in: [client_1.OrganizationRole.OWNER, client_1.OrganizationRole.ADMIN, client_1.OrganizationRole.MODERATOR] },
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
    const enriched = await Promise.all(members.map(async (m) => {
        const contributions = await (0, exports.calculateUserContributions)(m.userId);
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
    }));
    return enriched;
};
exports.getOrganizationAdminsAndModerators = getOrganizationAdminsAndModerators;
const getOrganizationTopContributors = async (idOrSlug, limit = 10) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const memberships = await prisma_1.db.organizationMembership.findMany({
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
    const memberStats = await Promise.all(memberships.map(async (m) => {
        const contributions = await (0, exports.calculateUserContributions)(m.userId);
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
    }));
    // Filter only those with at least 1 contribution and sort desc
    const contributors = memberStats
        .filter((m) => m.contributions.total > 0)
        .sort((a, b) => b.contributions.total - a.contributions.total)
        .slice(0, limit);
    return contributors;
};
exports.getOrganizationTopContributors = getOrganizationTopContributors;
const joinOrganization = async (idOrSlug, userId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    if (org.visibility === client_1.OrganizationVisibility.PRIVATE) {
        throw new Error('This organization is private. Please submit a join request instead.');
    }
    // Check if existing membership
    const existing = await prisma_1.db.organizationMembership.findUnique({
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
    const membership = await prisma_1.db.organizationMembership.create({
        data: {
            organizationId: org.id,
            userId,
            role: client_1.OrganizationRole.MEMBER,
            moderationStatus: client_1.MembershipModerationStatus.ACTIVE,
        },
        include: {
            organization: true,
            user: {
                select: { id: true, fullName: true, userName: true },
            },
        },
    });
    // Clean up any pending join request for this user
    await prisma_1.db.organizationJoinRequest.updateMany({
        where: {
            organizationId: org.id,
            userId,
            status: client_1.JoinRequestStatus.PENDING,
        },
        data: {
            status: client_1.JoinRequestStatus.APPROVED,
            reviewedAt: new Date(),
        },
    });
    return membership;
};
exports.joinOrganization = joinOrganization;
const leaveOrganization = async (idOrSlug, userId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const membership = await prisma_1.db.organizationMembership.findUnique({
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
    if (membership.role === client_1.OrganizationRole.OWNER) {
        const ownerCount = await prisma_1.db.organizationMembership.count({
            where: {
                organizationId: org.id,
                role: client_1.OrganizationRole.OWNER,
                userId: { not: userId },
            },
        });
        if (ownerCount === 0) {
            throw new Error('As the sole owner, you cannot leave the organization without transferring ownership or closing the organization.');
        }
    }
    await prisma_1.db.organizationMembership.delete({
        where: { id: membership.id },
    });
    return { success: true, message: 'Successfully left the organization' };
};
exports.leaveOrganization = leaveOrganization;
const inviteMember = async (idOrSlug, actorUserId, payload) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    // Validate actor permission
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized: You are not a member of this organization');
    }
    const permissions = (0, organizationPermissions_1.getOrganizationPermissions)({
        role: actorMembership.role,
        moderationStatus: actorMembership.moderationStatus,
    });
    if (!permissions.inviteMembers) {
        throw new Error('Unauthorized: You do not have permission to invite members');
    }
    const targetRole = payload.role || client_1.OrganizationRole.MEMBER;
    if (!(0, organizationPermissions_1.canAssignRole)(actorMembership.role, targetRole)) {
        throw new Error(`Unauthorized: You cannot invite with role ${targetRole}`);
    }
    const query = payload.emailOrUsername.trim();
    const targetUser = await prisma_1.db.user.findFirst({
        where: {
            OR: [{ email: query.toLowerCase() }, { userName: query }],
        },
    });
    const emailToInvite = targetUser?.email || query.toLowerCase();
    // Check if target user is already a member
    if (targetUser) {
        const existingMember = await prisma_1.db.organizationMembership.findUnique({
            where: { organizationId_userId: { organizationId: org.id, userId: targetUser.id } },
        });
        if (existingMember) {
            throw new Error('User is already a member of this organization');
        }
    }
    // Check if invitation is already pending
    const existingInvite = await prisma_1.db.organizationInvitation.findFirst({
        where: {
            organizationId: org.id,
            email: emailToInvite,
            status: client_1.InvitationStatus.PENDING,
        },
    });
    if (existingInvite) {
        throw new Error('An invitation is already pending for this user');
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    const invitation = await prisma_1.db.organizationInvitation.create({
        data: {
            organizationId: org.id,
            email: emailToInvite,
            invitedBy: actorUserId,
            role: targetRole,
            status: client_1.InvitationStatus.PENDING,
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
exports.inviteMember = inviteMember;
const getOrganizationInvitations = async (idOrSlug, actorUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership ||
        (actorMembership.role !== client_1.OrganizationRole.OWNER &&
            actorMembership.role !== client_1.OrganizationRole.ADMIN &&
            actorMembership.role !== client_1.OrganizationRole.MODERATOR)) {
        throw new Error('Unauthorized to view invitations');
    }
    const invitations = await prisma_1.db.organizationInvitation.findMany({
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
exports.getOrganizationInvitations = getOrganizationInvitations;
const getMyInvitations = async (userId) => {
    const user = await prisma_1.db.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const invitations = await prisma_1.db.organizationInvitation.findMany({
        where: {
            email: user.email,
            status: client_1.InvitationStatus.PENDING,
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
exports.getMyInvitations = getMyInvitations;
const acceptInvitation = async (invitationId, userId) => {
    const user = await prisma_1.db.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const invitation = await prisma_1.db.organizationInvitation.findUnique({
        where: { id: invitationId },
        include: { organization: true },
    });
    if (!invitation) {
        throw new Error('Invitation not found');
    }
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error('This invitation was sent to a different email address');
    }
    if (invitation.status !== client_1.InvitationStatus.PENDING) {
        throw new Error(`Invitation is already ${invitation.status.toLowerCase()}`);
    }
    if (new Date() > invitation.expiresAt) {
        await prisma_1.db.organizationInvitation.update({
            where: { id: invitationId },
            data: { status: client_1.InvitationStatus.EXPIRED },
        });
        throw new Error('This invitation has expired');
    }
    // Create membership & mark accepted
    const [membership] = await prisma_1.db.$transaction([
        prisma_1.db.organizationMembership.create({
            data: {
                organizationId: invitation.organizationId,
                userId,
                role: invitation.role,
                invitedBy: invitation.invitedBy,
            },
        }),
        prisma_1.db.organizationInvitation.update({
            where: { id: invitationId },
            data: { status: client_1.InvitationStatus.ACCEPTED },
        }),
    ]);
    return membership;
};
exports.acceptInvitation = acceptInvitation;
const declineInvitation = async (invitationId, userId) => {
    const user = await prisma_1.db.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('User not found');
    const invitation = await prisma_1.db.organizationInvitation.findUnique({
        where: { id: invitationId },
    });
    if (!invitation || invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error('Invitation not found');
    }
    const updated = await prisma_1.db.organizationInvitation.update({
        where: { id: invitationId },
        data: { status: client_1.InvitationStatus.REJECTED },
    });
    return updated;
};
exports.declineInvitation = declineInvitation;
const cancelInvitation = async (idOrSlug, invitationId, actorUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership ||
        (actorMembership.role !== client_1.OrganizationRole.OWNER && actorMembership.role !== client_1.OrganizationRole.ADMIN)) {
        throw new Error('Unauthorized to cancel invitation');
    }
    const invitation = await prisma_1.db.organizationInvitation.update({
        where: { id: invitationId, organizationId: org.id },
        data: { status: client_1.InvitationStatus.CANCELLED },
    });
    return invitation;
};
exports.cancelInvitation = cancelInvitation;
const requestToJoin = async (idOrSlug, userId, message) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    // Check if user is already a member
    const existing = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId } },
    });
    if (existing) {
        throw new Error('You are already a member of this organization');
    }
    // Check existing request
    const existingRequest = await prisma_1.db.organizationJoinRequest.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId } },
    });
    if (existingRequest) {
        if (existingRequest.status === client_1.JoinRequestStatus.PENDING) {
            throw new Error('You already have a pending join request for this organization');
        }
        // Reactivate request if previously rejected or cancelled
        const updated = await prisma_1.db.organizationJoinRequest.update({
            where: { id: existingRequest.id },
            data: {
                status: client_1.JoinRequestStatus.PENDING,
                message,
                rejectionReason: null,
                reviewedBy: null,
                reviewedAt: null,
            },
        });
        return updated;
    }
    const joinRequest = await prisma_1.db.organizationJoinRequest.create({
        data: {
            organizationId: org.id,
            userId,
            message,
            status: client_1.JoinRequestStatus.PENDING,
        },
    });
    return joinRequest;
};
exports.requestToJoin = requestToJoin;
const getJoinRequests = async (idOrSlug, actorUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership ||
        (actorMembership.role !== client_1.OrganizationRole.OWNER &&
            actorMembership.role !== client_1.OrganizationRole.ADMIN &&
            actorMembership.role !== client_1.OrganizationRole.MODERATOR)) {
        throw new Error('Unauthorized to view join requests');
    }
    const requests = await prisma_1.db.organizationJoinRequest.findMany({
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
exports.getJoinRequests = getJoinRequests;
const approveJoinRequest = async (idOrSlug, requestId, actorUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized');
    }
    const permissions = (0, organizationPermissions_1.getOrganizationPermissions)({
        role: actorMembership.role,
        moderationStatus: actorMembership.moderationStatus,
    });
    if (!permissions.approveJoinRequests) {
        throw new Error('Unauthorized: You do not have permission to approve join requests');
    }
    const request = await prisma_1.db.organizationJoinRequest.findUnique({
        where: { id: requestId },
    });
    if (!request || request.organizationId !== org.id) {
        throw new Error('Join request not found');
    }
    if (request.status !== client_1.JoinRequestStatus.PENDING) {
        throw new Error(`Request has already been ${request.status.toLowerCase()}`);
    }
    // Create membership and update request status in transaction
    const [membership, updatedRequest] = await prisma_1.db.$transaction([
        prisma_1.db.organizationMembership.create({
            data: {
                organizationId: org.id,
                userId: request.userId,
                role: client_1.OrganizationRole.MEMBER,
                moderationStatus: client_1.MembershipModerationStatus.ACTIVE,
            },
            include: {
                user: { select: { id: true, fullName: true, userName: true } },
            },
        }),
        prisma_1.db.organizationJoinRequest.update({
            where: { id: requestId },
            data: {
                status: client_1.JoinRequestStatus.APPROVED,
                reviewedBy: actorUserId,
                reviewedAt: new Date(),
            },
        }),
    ]);
    return { membership, request: updatedRequest };
};
exports.approveJoinRequest = approveJoinRequest;
const rejectJoinRequest = async (idOrSlug, requestId, actorUserId, reason) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized');
    }
    const permissions = (0, organizationPermissions_1.getOrganizationPermissions)({
        role: actorMembership.role,
        moderationStatus: actorMembership.moderationStatus,
    });
    if (!permissions.rejectJoinRequests) {
        throw new Error('Unauthorized: You do not have permission to reject join requests');
    }
    const request = await prisma_1.db.organizationJoinRequest.findUnique({
        where: { id: requestId },
    });
    if (!request || request.organizationId !== org.id) {
        throw new Error('Join request not found');
    }
    const updated = await prisma_1.db.organizationJoinRequest.update({
        where: { id: requestId },
        data: {
            status: client_1.JoinRequestStatus.REJECTED,
            reviewedBy: actorUserId,
            reviewedAt: new Date(),
            rejectionReason: reason,
        },
    });
    return updated;
};
exports.rejectJoinRequest = rejectJoinRequest;
const updateMemberRole = async (idOrSlug, memberId, actorUserId, newRole) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized: You are not a member of this organization');
    }
    const targetMember = await prisma_1.db.organizationMembership.findUnique({
        where: { id: memberId },
    });
    if (!targetMember || targetMember.organizationId !== org.id) {
        throw new Error('Member not found in this organization');
    }
    if (targetMember.role === client_1.OrganizationRole.OWNER && actorMembership.role !== client_1.OrganizationRole.OWNER) {
        throw new Error('Cannot change the role of the organization Owner');
    }
    if (newRole === client_1.OrganizationRole.OWNER) {
        throw new Error('Owner assignment is only possible through explicit ownership transfer');
    }
    if (!(0, organizationPermissions_1.canManageTargetMember)(actorMembership.role, targetMember.role)) {
        throw new Error('You do not have permission to manage this member');
    }
    if (!(0, organizationPermissions_1.canAssignRole)(actorMembership.role, newRole)) {
        throw new Error(`You do not have permission to assign role ${newRole}`);
    }
    const updated = await prisma_1.db.organizationMembership.update({
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
exports.updateMemberRole = updateMemberRole;
const removeMember = async (idOrSlug, memberId, actorUserId) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized');
    }
    const targetMember = await prisma_1.db.organizationMembership.findUnique({
        where: { id: memberId },
    });
    if (!targetMember || targetMember.organizationId !== org.id) {
        throw new Error('Member not found in this organization');
    }
    if (targetMember.role === client_1.OrganizationRole.OWNER) {
        throw new Error('The organization Owner cannot be removed');
    }
    if (!(0, organizationPermissions_1.canManageTargetMember)(actorMembership.role, targetMember.role)) {
        throw new Error('You do not have permission to remove this member');
    }
    await prisma_1.db.organizationMembership.delete({
        where: { id: memberId },
    });
    return { success: true, message: 'Member successfully removed' };
};
exports.removeMember = removeMember;
const moderateMember = async (idOrSlug, memberId, actorUserId, action, reason) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const actorMembership = await prisma_1.db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: org.id, userId: actorUserId } },
    });
    if (!actorMembership) {
        throw new Error('Unauthorized');
    }
    const permissions = (0, organizationPermissions_1.getOrganizationPermissions)({
        role: actorMembership.role,
        moderationStatus: actorMembership.moderationStatus,
    });
    if (!permissions.moderateMembers) {
        throw new Error('Unauthorized: You do not have moderation permissions');
    }
    const targetMember = await prisma_1.db.organizationMembership.findUnique({
        where: { id: memberId },
    });
    if (!targetMember || targetMember.organizationId !== org.id) {
        throw new Error('Member not found');
    }
    if (targetMember.role === client_1.OrganizationRole.OWNER) {
        throw new Error('Cannot moderate the organization Owner');
    }
    if (actorMembership.role === client_1.OrganizationRole.MODERATOR && targetMember.role === client_1.OrganizationRole.ADMIN) {
        throw new Error('Moderators cannot moderate Admins');
    }
    let newStatus = client_1.MembershipModerationStatus.ACTIVE;
    if (action === 'RESTRICT')
        newStatus = client_1.MembershipModerationStatus.RESTRICTED;
    else if (action === 'SUSPEND')
        newStatus = client_1.MembershipModerationStatus.SUSPENDED;
    else if (action === 'BAN')
        newStatus = client_1.MembershipModerationStatus.BANNED;
    else if (action === 'UNRESTRICT')
        newStatus = client_1.MembershipModerationStatus.ACTIVE;
    const updated = await prisma_1.db.organizationMembership.update({
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
exports.moderateMember = moderateMember;
const searchCandidateUsers = async (idOrSlug, actorUserId, query) => {
    const org = await (0, exports.resolveOrganization)(idOrSlug);
    const cleanQuery = query.trim();
    if (!cleanQuery)
        return [];
    const users = await prisma_1.db.user.findMany({
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
                where: { organizationId: org.id, status: client_1.JoinRequestStatus.PENDING },
                select: { id: true },
            },
        },
        take: 10,
    });
    const invitations = await prisma_1.db.organizationInvitation.findMany({
        where: {
            organizationId: org.id,
            email: { in: users.map((u) => u.email) },
            status: client_1.InvitationStatus.PENDING,
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
exports.searchCandidateUsers = searchCandidateUsers;
