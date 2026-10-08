import { db as prisma } from '../../../lib/prisma';
import { UserFeedContext, CaseFeedProjection } from './caseFeedScorer';

export const caseFeedSelectClause = {
  id: true,
  title: true,
  titleHtml: true,
  location: true,
  caseStatus: true,
  visibility: true,
  isAnonymous: true,
  authorId: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  lastActivityAt: true,
  author: {
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
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      visibility: true,
    },
  },
  _count: {
    select: {
      caseReactions: true,
      discussions: true,
      evidence: true,
      sources: true,
      caseViews: true,
      claims: true,
    },
  },
  claims: {
    take: 5,
    select: {
      id: true,
      title: true,
      evidence: {
        take: 4,
        select: {
          evidence: {
            select: {
              medias: {
                select: { media: { select: { url: true, type: true } } },
              },
            },
          },
        },
      },
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
        },
      },
    },
  },
  caseReactions: {
    select: { value: true, userId: true },
  },
  medias: {
    take: 10,
    select: { media: { select: { url: true, type: true } } },
  },
  officialResponses: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      organizationId: true,
      content: true,
      createdAt: true,
      organization: { select: { name: true, slug: true, logoUrl: true } },
    },
  },
};

/**
 * 1. Fetch candidate cases from joined organizations
 */
export const getJoinedOrganizationCases = async (
  userContext: UserFeedContext,
  limit: number = 60
): Promise<CaseFeedProjection[]> => {
  if (userContext.joinedOrgIds.size === 0) return [];

  const orgIds = Array.from(userContext.joinedOrgIds);

  const cases = await prisma.case.findMany({
    where: {
      caseStatus: 'SHOW',
      OR: [
        { organizationId: { in: orgIds } },
        { officialResponses: { some: { organizationId: { in: orgIds } } } },
      ],
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'JOINED_ORGANIZATION',
  }));
};

/**
 * 2. Fetch candidate cases directly followed by the user
 */
export const getFollowedCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  if (userContext.followedCaseIds.size === 0) return [];

  const caseIds = Array.from(userContext.followedCaseIds);

  const cases = await prisma.case.findMany({
    where: {
      id: { in: caseIds },
      caseStatus: 'SHOW',
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'FOLLOWED_CASE',
  }));
};

/**
 * 3. Fetch candidate cases from followed organizations
 */
export const getFollowedOrganizationCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  if (userContext.followedOrgIds.size === 0) return [];

  const orgIds = Array.from(userContext.followedOrgIds);

  const cases = await prisma.case.findMany({
    where: {
      organizationId: { in: orgIds },
      caseStatus: 'SHOW',
      OR: [
        { visibility: 'PUBLIC' },
        { organization: { visibility: 'PUBLIC' } },
        { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
      ],
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'FOLLOWED_ORGANIZATION',
  }));
};

/**
 * 4. Fetch candidate cases that the user has contributed to (evidence, claims, sources, opinions)
 */
export const getContributedCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  if (!userContext.userId || userContext.contributedCaseIds.size === 0) return [];

  const caseIds = Array.from(userContext.contributedCaseIds.keys());

  const cases = await prisma.case.findMany({
    where: {
      id: { in: caseIds },
      caseStatus: 'SHOW',
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'USER_CONTRIBUTED',
  }));
};

/**
 * 5. Fetch candidate cases matching user's geographic area
 */
export const getNearbyCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  const loc = userContext.userLocation || userContext.userCity;
  if (!loc) return [];

  const cases = await prisma.case.findMany({
    where: {
      caseStatus: 'SHOW',
      location: { contains: loc, mode: 'insensitive' },
      OR: [
        { visibility: 'PUBLIC' },
        { organizationId: null },
        { organization: { visibility: 'PUBLIC' } },
        { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
      ],
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'LOCAL_RELEVANCE',
  }));
};

/**
 * 6. Fetch recent active public cases
 */
export const getRecentActiveCases = async (
  userContext: UserFeedContext,
  limit: number = 50,
  tag?: string,
  author?: string
): Promise<CaseFeedProjection[]> => {
  const whereClause: any = {
    caseStatus: 'SHOW',
    OR: [
      { visibility: 'PUBLIC' },
      { organizationId: null },
      { organization: { visibility: 'PUBLIC' } },
      { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
    ],
  };

  if (tag) {
    whereClause.tags = { some: { tag: { normalizedName: tag.toLowerCase() } } };
  }

  if (author) {
    whereClause.author = {
      OR: [
        { userName: { equals: author, mode: 'insensitive' } },
        { id: author },
      ],
    };
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'RECENT_ACTIVITY',
  }));
};

/**
 * 7. Fetch trending cases with highest recent evidence and discussion velocity
 */
export const getTrendingCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  const cases = await prisma.case.findMany({
    where: {
      caseStatus: 'SHOW',
      OR: [
        { visibility: 'PUBLIC' },
        { organizationId: null },
        { organization: { visibility: 'PUBLIC' } },
        { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
      ],
    },
    select: caseFeedSelectClause,
    orderBy: [
      { evidence: { _count: 'desc' } },
      { discussions: { _count: 'desc' } },
      { lastActivityAt: 'desc' },
    ],
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'TRENDING',
  }));
};

/**
 * 8. Fetch candidate cases matching user's engaged tags / topics
 */
export const getRecommendedTopicCases = async (
  userContext: UserFeedContext,
  limit: number = 40
): Promise<CaseFeedProjection[]> => {
  if (userContext.engagedTags.size === 0) return [];

  const topTags = Array.from(userContext.engagedTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => e[0]);

  const cases = await prisma.case.findMany({
    where: {
      caseStatus: 'SHOW',
      tags: { some: { tag: { normalizedName: { in: topTags } } } },
      OR: [
        { visibility: 'PUBLIC' },
        { organizationId: null },
        { organization: { visibility: 'PUBLIC' } },
        { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
      ],
    },
    select: caseFeedSelectClause,
    orderBy: { lastActivityAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'TOPIC_RECOMMENDATION',
  }));
};

/**
 * 9. Fetch exploration candidates to avoid echo chambers (Diverse public cases)
 */
export const getExplorationCases = async (
  userContext: UserFeedContext,
  limit: number = 20
): Promise<CaseFeedProjection[]> => {
  const cases = await prisma.case.findMany({
    where: {
      caseStatus: 'SHOW',
      visibility: 'PUBLIC',
      organization: { visibility: 'PUBLIC' },
    },
    select: caseFeedSelectClause,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return cases.map((c) => ({
    ...(c as unknown as CaseFeedProjection),
    candidateSource: 'EXPLORATION',
  }));
};
