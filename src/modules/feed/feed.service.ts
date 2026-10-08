import { db as prisma } from '../../../lib/prisma';
import {
  UserFeedContext,
  CaseFeedProjection,
  scoreCaseForUser,
  applyMultiDimensionalDiversity,
  ScoredFeedCandidate,
} from './caseFeedScorer';
import {
  getJoinedOrganizationCases,
  getFollowedCases,
  getFollowedOrganizationCases,
  getContributedCases,
  getNearbyCases,
  getRecentActiveCases,
  getTrendingCases,
  getRecommendedTopicCases,
  getExplorationCases,
  caseFeedSelectClause,
} from './sources';
import { sanitizeAnonymousCase } from '../../utils/privacy.utils';

export interface FeedQueryParams {
  userId?: string;
  cursor?: string;
  page?: number;
  limit?: number;
  sort?: string;
  tag?: string;
  author?: string;
  debug?: boolean;
}

class FeedService {
  /**
   * STEP 1 & 2: Load complete, lightweight user context for feed personalization
   */
  async loadUserContext(userId?: string): Promise<UserFeedContext> {
    if (!userId) {
      return {
        joinedOrgRoles: new Map<string, string>(),
        joinedOrgIds: new Set<string>(),
        followedOrgIds: new Set<string>(),
        followedCaseIds: new Set<string>(),
        savedCaseIds: new Set<string>(),
        contributedCaseIds: new Map<string, Set<'EVIDENCE' | 'CLAIM' | 'SOURCE' | 'DISCUSSION'>>(),
        engagedTags: new Map<string, number>(),
        hiddenCaseIds: new Set<string>(),
        mutedOrgIds: new Set<string>(),
        notInterestedCaseIds: new Set<string>(),
      };
    }

    const [
      memberships,
      caseFollows,
      orgFollows,
      bookmarks,
      feedbackSignals,
      userAddress,
      userClaims,
      userCaseSources,
      userClaimEvidence,
      userOpinions,
    ] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { userId, moderationStatus: { not: 'BANNED' } },
        select: { organizationId: true, role: true },
      }),
      prisma.caseFollow.findMany({
        where: { userId },
        select: { caseId: true },
      }),
      prisma.organizationFollow.findMany({
        where: { userId },
        select: { organizationId: true },
      }),
      prisma.caseBookmark.findMany({
        where: { userId },
        select: { caseId: true },
      }),
      prisma.userFeedbackSignal.findMany({
        where: { userId },
        select: { targetType: true, targetId: true, action: true },
      }),
      prisma.userAddress.findUnique({
        where: { userId },
        select: { city: true, state: true, address: true },
      }),
      prisma.claim.findMany({
        where: { createdBy: userId },
        select: { caseId: true },
        take: 50,
      }),
      prisma.caseSource.findMany({
        where: { source: { createdBy: userId } },
        select: { caseId: true },
        take: 50,
      }),
      prisma.claimEvidence.findMany({
        where: { evidence: { submittedBy: userId } },
        select: { claim: { select: { caseId: true } } },
        take: 50,
      }),
      prisma.opinion.findMany({
        where: { authorId: userId, targetType: 'CASE' },
        select: { targetId: true },
        take: 50,
      }),
    ]);

    // Build Contributed Case IDs mapping
    const contributedCaseIds = new Map<string, Set<'EVIDENCE' | 'CLAIM' | 'SOURCE' | 'DISCUSSION'>>();

    const addContrib = (cId: string | null | undefined, type: 'EVIDENCE' | 'CLAIM' | 'SOURCE' | 'DISCUSSION') => {
      if (!cId) return;
      if (!contributedCaseIds.has(cId)) contributedCaseIds.set(cId, new Set());
      contributedCaseIds.get(cId)!.add(type);
    };

    userClaims.forEach((cl) => addContrib(cl.caseId, 'CLAIM'));
    userCaseSources.forEach((src) => addContrib(src.caseId, 'SOURCE'));
    userClaimEvidence.forEach((ce) => addContrib(ce.claim?.caseId, 'EVIDENCE'));
    userOpinions.forEach((op) => addContrib(op.targetId, 'DISCUSSION'));

    // Process Feedback Signals
    const hiddenCaseIds = new Set<string>();
    const notInterestedCaseIds = new Set<string>();
    const mutedOrgIds = new Set<string>();

    feedbackSignals.forEach((sig) => {
      if (sig.targetType === 'CASE' && sig.action === 'HIDE') hiddenCaseIds.add(sig.targetId);
      if (sig.targetType === 'CASE' && sig.action === 'NOT_INTERESTED')
        notInterestedCaseIds.add(sig.targetId);
      if (sig.targetType === 'ORGANIZATION' && sig.action === 'MUTE')
        mutedOrgIds.add(sig.targetId);
    });

    // Process Org Memberships & Roles
    const joinedOrgRoles = new Map<string, string>();
    const joinedOrgIds = new Set<string>();
    memberships.forEach((m) => {
      joinedOrgRoles.set(m.organizationId, m.role);
      joinedOrgIds.add(m.organizationId);
    });

    // Extract Engaged Tags
    const engagedTags = new Map<string, number>();
    const interactedCaseIds = [
      ...Array.from(contributedCaseIds.keys()),
      ...caseFollows.map((c) => c.caseId),
      ...bookmarks.map((b) => b.caseId),
    ].slice(0, 30);

    if (interactedCaseIds.length > 0) {
      const caseTags = await prisma.caseTag.findMany({
        where: { caseId: { in: interactedCaseIds } },
        select: { tag: { select: { normalizedName: true } } },
      });

      caseTags.forEach((ct) => {
        const name = ct.tag.normalizedName;
        engagedTags.set(name, (engagedTags.get(name) || 0) + 1);
      });
    }

    return {
      userId,
      joinedOrgRoles,
      joinedOrgIds,
      followedOrgIds: new Set(orgFollows.map((o) => o.organizationId)),
      followedCaseIds: new Set(caseFollows.map((c) => c.caseId)),
      savedCaseIds: new Set(bookmarks.map((b) => b.caseId)),
      contributedCaseIds,
      engagedTags,
      hiddenCaseIds,
      mutedOrgIds,
      notInterestedCaseIds,
      userLocation: userAddress?.address || null,
      userCity: userAddress?.city || null,
      userState: userAddress?.state || null,
    };
  }

  /**
   * Main 12-Step Personalized Case News Feed Pipeline
   */
  async getPersonalizedFeed(params: FeedQueryParams) {
    const startTime = Date.now();
    const limit = Math.min(50, Math.max(1, params.limit || 20));

    // STEP 1 & 2: Identify user and load context
    const userContext = await this.loadUserContext(params.userId);

    // STEP 3: Candidate Generation (parallel queries with bounded pools)
    const [
      joinedOrgCandidates,
      followedCaseCandidates,
      followedOrgCandidates,
      contributedCandidates,
      nearbyCandidates,
      recentCandidates,
      trendingCandidates,
      topicCandidates,
      explorationCandidates,
    ] = await Promise.all([
      getJoinedOrganizationCases(userContext, 60),
      getFollowedCases(userContext, 40),
      getFollowedOrganizationCases(userContext, 40),
      getContributedCases(userContext, 40),
      getNearbyCases(userContext, 40),
      getRecentActiveCases(userContext, params.author ? 100 : 50, params.tag, params.author),
      getTrendingCases(userContext, 40),
      getRecommendedTopicCases(userContext, 40),
      getExplorationCases(userContext, 20),
    ]);

    // STEP 4: Access Control & Strict Privacy Filtering FIRST
    const allCandidates = [
      ...joinedOrgCandidates,
      ...followedCaseCandidates,
      ...followedOrgCandidates,
      ...contributedCandidates,
      ...nearbyCandidates,
      ...recentCandidates,
      ...trendingCandidates,
      ...topicCandidates,
      ...explorationCandidates,
    ];

    const candidateMap = new Map<string, CaseFeedProjection>();

    allCandidates.forEach((c) => {
      // Access Guard: Exclude non-show / moderated cases
      if (c.caseStatus !== 'SHOW') return;

      // Access Guard: Private organization cases can ONLY be seen by active joined members
      if (c.organization?.visibility === 'PRIVATE' || c.visibility === 'PRIVATE' || c.visibility === 'ORGANIZATION_ONLY') {
        if (!c.organizationId || !userContext.joinedOrgIds.has(c.organizationId)) {
          return; // Inaccessible
        }
      }

      // Negative feedback filter
      if (
        userContext.hiddenCaseIds.has(c.id) ||
        userContext.notInterestedCaseIds.has(c.id) ||
        (c.organizationId && userContext.mutedOrgIds.has(c.organizationId))
      ) {
        return;
      }

      // Author filter if specified
      if (params.author && c.author.userName !== params.author && c.author.id !== params.author) {
        return;
      }

      if (!candidateMap.has(c.id)) {
        candidateMap.set(c.id, c);
      }
    });

    const uniqueCandidates = Array.from(candidateMap.values());

    // STEP 5 & 6: Relevance Scoring & Temporal Freshness
    const scoredCandidates: ScoredFeedCandidate[] = uniqueCandidates
      .map((c) => scoreCaseForUser(userContext, c, params.debug))
      .filter((c) => c.score > 0);

    // Initial Sort by Raw Score descending
    if (params.sort === 'recent') {
      scoredCandidates.sort(
        (a, b) =>
          new Date(b.case.lastActivityAt || b.case.createdAt).getTime() -
          new Date(a.case.lastActivityAt || a.case.createdAt).getTime()
      );
    } else {
      scoredCandidates.sort((a, b) => b.score - a.score);
    }

    // STEP 7, 8 & 9: Multi-Dimensional Diversity & Exploration Re-Ranking
    const diversifiedCandidates =
      params.sort === 'recent'
        ? scoredCandidates
        : applyMultiDimensionalDiversity(scoredCandidates);

    // STEP 10: Stable Cursor-Based Pagination
    let startIndex = 0;
    if (params.cursor) {
      try {
        const decoded = Buffer.from(params.cursor, 'base64').toString('utf-8');
        const [cursorId] = decoded.split(':');
        const foundIdx = diversifiedCandidates.findIndex((c) => c.caseId === cursorId);
        if (foundIdx !== -1) {
          startIndex = foundIdx + 1;
        }
      } catch {
        startIndex = 0;
      }
    } else if (params.page && params.page > 1) {
      startIndex = (params.page - 1) * limit;
    }

    const paginated = diversifiedCandidates.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < diversifiedCandidates.length;

    let nextCursor: string | null = null;
    if (hasMore && paginated.length > 0) {
      const lastItem = paginated[paginated.length - 1];
      nextCursor = Buffer.from(`${lastItem.caseId}:${lastItem.score}`).toString('base64');
    }

    // STEP 11 & 12: Shape Response & Format (Protecting Whistleblower Privacy)
    const items = paginated.map((item) => {
      const sanitizedCase = this.formatCaseForFeed(item.case, userContext);

      return {
        case: sanitizedCase,
        context: {
          reason: item.primaryReason,
          label: item.reasonLabel,
          activitySummary: item.activitySummary,
          organizationName: item.organizationName,
        },
        ...(params.debug && item.debugBreakdown
          ? {
              debug: {
                score: item.score,
                candidateSource: item.case.candidateSource,
                level: item.level,
                signals: item.signals,
                breakdown: item.debugBreakdown,
              },
            }
          : {}),
      };
    });

    const duration = Date.now() - startTime;

    return {
      items,
      nextCursor,
      hasMore,
      meta: {
        totalCandidates: uniqueCandidates.length,
        returnedCount: items.length,
        durationMs: duration,
      },
    };
  }

  /**
   * Compatibility alias for legacy calls
   */
  async getNewsFeed(params: any) {
    return this.getPersonalizedFeed(params);
  }

  public formatCaseForFeed(c: CaseFeedProjection, userContext: UserFeedContext) {
    const supportCount = c.caseReactions
      ? c.caseReactions.filter((r) => r.value === 'SUPPORT').length
      : c._count?.caseReactions || 0;
    const opposeCount = c.caseReactions
      ? c.caseReactions.filter((r) => r.value === 'OPPOSE').length
      : 0;
    const currentUserReaction =
      userContext.userId && c.caseReactions
        ? c.caseReactions.find((r) => r.userId === userContext.userId)?.value || null
        : null;

    const rawCase = {
      id: c.id,
      title: c.title,
      titleHtml: c.titleHtml || '',
      location: c.location,
      caseStatus: c.caseStatus,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastActivityAt: c.lastActivityAt,
      isAnonymous: c.isAnonymous,
      author: {
        id: c.author?.id,
        fullName: c.author?.fullName,
        userName: c.author?.userName,
        userProfile: c.author?.userProfile,
        isVerified: false,
      },
      organization: c.organization
        ? {
            id: c.organization.id,
            name: c.organization.name,
            slug: c.organization.slug,
            logoUrl: c.organization.logoUrl,
            visibility: c.organization.visibility,
          }
        : null,
      stats: {
        supportCount,
        opposeCount,
        viewCount: c._count?.caseViews || 0,
        discussionCount: c._count?.discussions || 0,
        evidenceCount: c._count?.evidence || 0,
        sourceCount: c._count?.sources || 0,
        claimCount: c._count?.claims || 0,
      },
      claims: c.claims || [],
      tags: c.tags || [],
      medias: c.medias || [],
      officialResponses: c.officialResponses || [],
      userInteractions: {
        isFollowing: userContext.followedCaseIds.has(c.id),
        isSaved: userContext.savedCaseIds.has(c.id),
        isJoinedOrg: c.organizationId ? userContext.joinedOrgIds.has(c.organizationId) : false,
        currentUserReaction,
      },
    };

    return sanitizeAnonymousCase(rawCase);
  }

  // --- INTERACTION & FEEDBACK MUTATIONS ---

  async toggleFollowCase(userId: string, caseId: string) {
    const existing = await prisma.caseFollow.findUnique({
      where: { caseId_userId: { caseId, userId } },
    });

    if (existing) {
      await prisma.caseFollow.delete({
        where: { caseId_userId: { caseId, userId } },
      });
      return { following: false, message: 'Case unfollowed' };
    }

    await prisma.caseFollow.create({
      data: { userId, caseId },
    });
    return { following: true, message: 'Case followed' };
  }

  async toggleSaveCase(userId: string, caseId: string) {
    const existing = await prisma.caseBookmark.findUnique({
      where: { caseId_userId: { caseId, userId } },
    });

    if (existing) {
      await prisma.caseBookmark.delete({
        where: { caseId_userId: { caseId, userId } },
      });
      return { saved: false, message: 'Case removed from saved' };
    }

    await prisma.caseBookmark.create({
      data: { userId, caseId },
    });
    return { saved: true, message: 'Case saved' };
  }

  async hideCase(userId: string, caseId: string) {
    await prisma.userFeedbackSignal.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'CASE',
          targetId: caseId,
        },
      },
      update: { action: 'HIDE' },
      create: {
        userId,
        targetType: 'CASE',
        targetId: caseId,
        action: 'HIDE',
      },
    });

    return { message: 'Case hidden from feed' };
  }

  async markNotInterested(userId: string, caseId: string) {
    await prisma.userFeedbackSignal.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'CASE',
          targetId: caseId,
        },
      },
      update: { action: 'NOT_INTERESTED' },
      create: {
        userId,
        targetType: 'CASE',
        targetId: caseId,
        action: 'NOT_INTERESTED',
      },
    });

    return { message: 'Case marked as not interested' };
  }

  async muteOrganization(userId: string, organizationId: string) {
    await prisma.userFeedbackSignal.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: 'ORGANIZATION',
          targetId: organizationId,
        },
      },
      update: { action: 'MUTE' },
      create: {
        userId,
        targetType: 'ORGANIZATION',
        targetId: organizationId,
        action: 'MUTE',
      },
    });

    return { message: 'Organization muted' };
  }

  async toggleFollowOrganization(userId: string, organizationId: string) {
    const existing = await prisma.organizationFollow.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });

    if (existing) {
      await prisma.organizationFollow.delete({
        where: { organizationId_userId: { organizationId, userId } },
      });
      return { following: false, message: 'Organization unfollowed' };
    }

    await prisma.organizationFollow.create({
      data: { userId, organizationId },
    });
    return { following: true, message: 'Organization followed' };
  }

  async getSavedCases(userId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.caseBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          case: {
            select: caseFeedSelectClause,
          },
        },
      }),
      prisma.caseBookmark.count({
        where: { userId },
      }),
    ]);

    const userContext = await this.loadUserContext(userId);

    const items = bookmarks
      .map((b) => b.case)
      .filter((c) => {
        if (!c || c.caseStatus !== 'SHOW') return false;
        if (c.organization?.visibility === 'PRIVATE' || c.visibility === 'PRIVATE' || c.visibility === 'ORGANIZATION_ONLY') {
          if (!c.organizationId || !userContext.joinedOrgIds.has(c.organizationId)) return false;
        }
        return true;
      })
      .map((c) => ({
        case: this.formatCaseForFeed(c as any, userContext),
        context: {
          reason: 'SAVED',
          label: 'সংরক্ষিত বিষয়',
          organizationName: c.organization?.name || null,
        },
      }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + bookmarks.length < total,
    };
  }
}

export const feedService = new FeedService();
