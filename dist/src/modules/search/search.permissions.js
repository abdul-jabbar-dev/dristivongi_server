"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAnonymousAuthor = exports.getCaseSearchPermissionFilter = exports.getOrganizationSearchPermissionFilter = exports.buildSearchViewerContext = void 0;
const prisma_1 = require("../../../lib/prisma");
const client_1 = require("@prisma/client");
/**
 * Builds viewer context with user's active organization memberships
 */
const buildSearchViewerContext = async (userId) => {
    if (!userId) {
        return {
            userId: undefined,
            memberOrgIds: [],
            isAdmin: false,
        };
    }
    try {
        const user = await prisma_1.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                type: true,
                organizationMemberships: {
                    where: {
                        moderationStatus: { not: 'BANNED' },
                    },
                    select: {
                        organizationId: true,
                    },
                },
            },
        });
        if (!user) {
            return { userId: undefined, memberOrgIds: [], isAdmin: false };
        }
        const memberOrgIds = user.organizationMemberships.map(m => m.organizationId);
        const isAdmin = user.type === 'admin' || user.type === 'ADMIN';
        return {
            userId,
            memberOrgIds,
            isAdmin,
        };
    }
    catch (err) {
        return { userId, memberOrgIds: [], isAdmin: false };
    }
};
exports.buildSearchViewerContext = buildSearchViewerContext;
/**
 * Generates Prisma where filter for Organizations based on viewer permissions
 */
const getOrganizationSearchPermissionFilter = (viewer) => {
    const baseStatus = {
        status: { notIn: [client_1.OrganizationStatus.SUSPENDED, client_1.OrganizationStatus.ARCHIVED] }
    };
    if (viewer.isAdmin) {
        return baseStatus;
    }
    if (viewer.userId && viewer.memberOrgIds.length > 0) {
        return {
            ...baseStatus,
            OR: [
                { visibility: client_1.OrganizationVisibility.PUBLIC },
                { id: { in: viewer.memberOrgIds } },
            ],
        };
    }
    return {
        ...baseStatus,
        visibility: client_1.OrganizationVisibility.PUBLIC,
    };
};
exports.getOrganizationSearchPermissionFilter = getOrganizationSearchPermissionFilter;
/**
 * Generates Prisma where filter for Cases based on viewer permissions and moderation
 */
const getCaseSearchPermissionFilter = (viewer) => {
    // Always exclude hidden or blocked cases from normal search
    const moderationFilter = {
        caseStatus: { notIn: ['HIDDEN', 'BLOCKED'] },
    };
    if (viewer.isAdmin) {
        return moderationFilter;
    }
    // Public cases are visible to everyone
    const publicCaseClause = { visibility: 'PUBLIC' };
    if (!viewer.userId) {
        return {
            ...moderationFilter,
            ...publicCaseClause,
        };
    }
    const clauses = [
        publicCaseClause,
        { authorId: viewer.userId }, // Creator can see their own private cases
    ];
    if (viewer.memberOrgIds.length > 0) {
        clauses.push({
            organizationId: { in: viewer.memberOrgIds },
        });
    }
    return {
        ...moderationFilter,
        OR: clauses,
    };
};
exports.getCaseSearchPermissionFilter = getCaseSearchPermissionFilter;
/**
 * Sanitizes author / user data if anonymous
 */
const sanitizeAnonymousAuthor = (isAnonymous, author) => {
    if (isAnonymous || !author) {
        return {
            id: '',
            name: 'Anonymous Contributor',
            userName: null,
            avatarUrl: null,
        };
    }
    return {
        id: author.id || '',
        name: author.fullName || 'Citizen',
        userName: author.userName || null,
        avatarUrl: author.userProfile?.profilePicture || null,
    };
};
exports.sanitizeAnonymousAuthor = sanitizeAnonymousAuthor;
