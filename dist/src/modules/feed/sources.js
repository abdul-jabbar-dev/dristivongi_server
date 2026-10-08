"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExplorationCases = exports.getRecommendedTopicCases = exports.getTrendingCases = exports.getRecentActiveCases = exports.getNearbyCases = exports.getContributedCases = exports.getFollowedOrganizationCases = exports.getFollowedCases = exports.getJoinedOrganizationCases = exports.caseFeedSelectClause = void 0;
const prisma_1 = require("../../../lib/prisma");
exports.caseFeedSelectClause = {
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
        orderBy: { createdAt: 'desc' },
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
const getJoinedOrganizationCases = async (userContext, limit = 60) => {
    if (userContext.joinedOrgIds.size === 0)
        return [];
    const orgIds = Array.from(userContext.joinedOrgIds);
    const cases = await prisma_1.db.case.findMany({
        where: {
            caseStatus: 'SHOW',
            OR: [
                { organizationId: { in: orgIds } },
                { officialResponses: { some: { organizationId: { in: orgIds } } } },
            ],
        },
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'JOINED_ORGANIZATION',
    }));
};
exports.getJoinedOrganizationCases = getJoinedOrganizationCases;
/**
 * 2. Fetch candidate cases directly followed by the user
 */
const getFollowedCases = async (userContext, limit = 40) => {
    if (userContext.followedCaseIds.size === 0)
        return [];
    const caseIds = Array.from(userContext.followedCaseIds);
    const cases = await prisma_1.db.case.findMany({
        where: {
            id: { in: caseIds },
            caseStatus: 'SHOW',
        },
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'FOLLOWED_CASE',
    }));
};
exports.getFollowedCases = getFollowedCases;
/**
 * 3. Fetch candidate cases from followed organizations
 */
const getFollowedOrganizationCases = async (userContext, limit = 40) => {
    if (userContext.followedOrgIds.size === 0)
        return [];
    const orgIds = Array.from(userContext.followedOrgIds);
    const cases = await prisma_1.db.case.findMany({
        where: {
            organizationId: { in: orgIds },
            caseStatus: 'SHOW',
            OR: [
                { visibility: 'PUBLIC' },
                { organization: { visibility: 'PUBLIC' } },
                { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
            ],
        },
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'FOLLOWED_ORGANIZATION',
    }));
};
exports.getFollowedOrganizationCases = getFollowedOrganizationCases;
/**
 * 4. Fetch candidate cases that the user has contributed to (evidence, claims, sources, opinions)
 */
const getContributedCases = async (userContext, limit = 40) => {
    if (!userContext.userId || userContext.contributedCaseIds.size === 0)
        return [];
    const caseIds = Array.from(userContext.contributedCaseIds.keys());
    const cases = await prisma_1.db.case.findMany({
        where: {
            id: { in: caseIds },
            caseStatus: 'SHOW',
        },
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'USER_CONTRIBUTED',
    }));
};
exports.getContributedCases = getContributedCases;
/**
 * 5. Fetch candidate cases matching user's geographic area
 */
const getNearbyCases = async (userContext, limit = 40) => {
    const loc = userContext.userLocation || userContext.userCity;
    if (!loc)
        return [];
    const cases = await prisma_1.db.case.findMany({
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
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'LOCAL_RELEVANCE',
    }));
};
exports.getNearbyCases = getNearbyCases;
/**
 * 6. Fetch recent active public cases
 */
const getRecentActiveCases = async (userContext, limit = 50, tag, author) => {
    const whereClause = {
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
    const cases = await prisma_1.db.case.findMany({
        where: whereClause,
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'RECENT_ACTIVITY',
    }));
};
exports.getRecentActiveCases = getRecentActiveCases;
/**
 * 7. Fetch trending cases with highest recent evidence and discussion velocity
 */
const getTrendingCases = async (userContext, limit = 40) => {
    const cases = await prisma_1.db.case.findMany({
        where: {
            caseStatus: 'SHOW',
            OR: [
                { visibility: 'PUBLIC' },
                { organizationId: null },
                { organization: { visibility: 'PUBLIC' } },
                { organizationId: { in: Array.from(userContext.joinedOrgIds) } },
            ],
        },
        select: exports.caseFeedSelectClause,
        orderBy: [
            { evidence: { _count: 'desc' } },
            { discussions: { _count: 'desc' } },
            { lastActivityAt: 'desc' },
        ],
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'TRENDING',
    }));
};
exports.getTrendingCases = getTrendingCases;
/**
 * 8. Fetch candidate cases matching user's engaged tags / topics
 */
const getRecommendedTopicCases = async (userContext, limit = 40) => {
    if (userContext.engagedTags.size === 0)
        return [];
    const topTags = Array.from(userContext.engagedTags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((e) => e[0]);
    const cases = await prisma_1.db.case.findMany({
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
        select: exports.caseFeedSelectClause,
        orderBy: { lastActivityAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'TOPIC_RECOMMENDATION',
    }));
};
exports.getRecommendedTopicCases = getRecommendedTopicCases;
/**
 * 9. Fetch exploration candidates to avoid echo chambers (Diverse public cases)
 */
const getExplorationCases = async (userContext, limit = 20) => {
    const cases = await prisma_1.db.case.findMany({
        where: {
            caseStatus: 'SHOW',
            visibility: 'PUBLIC',
            organization: { visibility: 'PUBLIC' },
        },
        select: exports.caseFeedSelectClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return cases.map((c) => ({
        ...c,
        candidateSource: 'EXPLORATION',
    }));
};
exports.getExplorationCases = getExplorationCases;
