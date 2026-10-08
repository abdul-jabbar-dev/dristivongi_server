import { db } from '../../../lib/prisma';
import { OrganizationVisibility, OrganizationStatus } from '@prisma/client';

export interface SearchViewerContext {
  userId?: string;
  memberOrgIds: string[];
  isAdmin: boolean;
}

/**
 * Builds viewer context with user's active organization memberships
 */
export const buildSearchViewerContext = async (userId?: string): Promise<SearchViewerContext> => {
  if (!userId) {
    return {
      userId: undefined,
      memberOrgIds: [],
      isAdmin: false,
    };
  }

  try {
    const user = await db.user.findUnique({
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
  } catch (err) {
    return { userId, memberOrgIds: [], isAdmin: false };
  }
};

/**
 * Generates Prisma where filter for Organizations based on viewer permissions
 */
export const getOrganizationSearchPermissionFilter = (viewer: SearchViewerContext) => {
  const baseStatus = {
    status: { notIn: [OrganizationStatus.SUSPENDED, OrganizationStatus.ARCHIVED] }
  };

  if (viewer.isAdmin) {
    return baseStatus;
  }

  if (viewer.userId && viewer.memberOrgIds.length > 0) {
    return {
      ...baseStatus,
      OR: [
        { visibility: OrganizationVisibility.PUBLIC },
        { id: { in: viewer.memberOrgIds } },
      ],
    };
  }

  return {
    ...baseStatus,
    visibility: OrganizationVisibility.PUBLIC,
  };
};

/**
 * Generates Prisma where filter for Cases based on viewer permissions and moderation
 */
export const getCaseSearchPermissionFilter = (viewer: SearchViewerContext) => {
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

  const clauses: any[] = [
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

/**
 * Sanitizes author / user data if anonymous
 */
export const sanitizeAnonymousAuthor = (
  isAnonymous: boolean,
  author?: {
    id?: string;
    fullName?: string | null;
    userName?: string | null;
    userProfile?: { profilePicture?: string | null } | null;
  } | null
) => {
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
