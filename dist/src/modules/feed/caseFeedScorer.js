"use strict";
/**
 * CIVICLENS — CASE-FIRST PERSONALIZED FEED RANKING ENGINE
 * Transparent, deterministic, multi-level civic relevance scorer.
 * No black-box ML. Evidence-first, organization-native, privacy-safe.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMultiDimensionalDiversity = exports.scoreCaseForUser = exports.FeedRankingConfig = void 0;
exports.FeedRankingConfig = {
    // Level 1: Direct Relationship Weights
    ORGANIZATION_MEMBERSHIP: {
        OWNER: 40,
        ADMIN: 36,
        MODERATOR: 32,
        MEMBER: 28,
        REPRESENTATIVE: 30,
    },
    FOLLOWED_CASE: 30,
    FOLLOWED_ORGANIZATION: 22,
    CONTRIBUTED_CASE: {
        EVIDENCE: 32,
        CLAIM: 28,
        SOURCE: 25,
        DISCUSSION: 20,
    },
    SAVED_CASE: 18,
    // Level 2: Evidence-First & Civic Activity Signals (Not relying solely on comments/likes)
    OFFICIAL_RESPONSE_BOOST: 25,
    EVIDENCE_DEPTH_WEIGHT: 20,
    SOURCE_DIVERSITY_WEIGHT: 15,
    CLAIM_DEPTH_WEIGHT: 12,
    DISCUSSION_ACTIVITY_WEIGHT: 8,
    COMMUNITY_EVALUATION_WEIGHT: 6,
    // Level 2: Temporal & Behavioral Relevance
    FRESHNESS_HALF_LIFE_HOURS: 48,
    RECENT_ACTIVITY_WEIGHT: 22,
    TOPIC_AFFINITY_WEIGHT: 18,
    LOCATION_RELEVANCE: {
        EXACT_CITY: 20,
        DISTRICT: 14,
        STATE: 8,
    },
    TRENDING_VELOCITY_WEIGHT: 10,
    // Level 3: Exploration Signal
    EXPLORATION_BOOST: 8,
    // Negative Feedback Penalties
    PENALTIES: {
        NOT_INTERESTED: -120,
        MUTED_ORGANIZATION: -150,
        HIDDEN_CASE: -200,
        RECENT_EXPOSURE_DECAY: 0.85,
    },
    // Diversity Constraints
    DIVERSITY: {
        MAX_CONSECUTIVE_PER_ORG: 2,
        MAX_CONSECUTIVE_PER_AUTHOR: 2,
        MAX_CONSECUTIVE_PER_TAG: 3,
        ORGANIZATION_PENALTY_FACTOR: 0.75,
        AUTHOR_PENALTY_FACTOR: 0.8,
        TAG_PENALTY_FACTOR: 0.85,
    },
    // Target Mix Distribution (For Blended Multi-Level Delivery)
    TARGET_DISTRIBUTION: {
        DIRECT_RELATIONSHIP: 0.50,
        BEHAVIORAL_RELEVANCE: 0.25,
        LOCAL_RECENT: 0.15,
        EXPLORATION: 0.10,
    },
};
/**
 * 5. Deterministic Relevance Scorer for CivicLens Cases
 */
const scoreCaseForUser = (userContext, c, includeDebug = false) => {
    const signals = {};
    let totalScore = 0;
    let primaryReason = 'RECOMMENDED';
    let reasonLabel = 'Recommended for you';
    let activitySummary = undefined;
    let level = 'EXPLORATION';
    // 1. Negative Signals Check (Hide / Mute / Not Interested)
    if (userContext.hiddenCaseIds.has(c.id) ||
        userContext.notInterestedCaseIds.has(c.id) ||
        (c.organizationId && userContext.mutedOrgIds.has(c.organizationId))) {
        return {
            caseId: c.id,
            case: c,
            score: exports.FeedRankingConfig.PENALTIES.HIDDEN_CASE,
            signals: { penalty: exports.FeedRankingConfig.PENALTIES.HIDDEN_CASE },
            primaryReason: 'FILTERED',
            reasonLabel: 'Excluded by user preference',
            level: 'EXPLORATION',
        };
    }
    // 2. Organization Affinity (Role-based weighting: OWNER > ADMIN > MODERATOR > MEMBER)
    let orgAffinityScore = 0;
    if (c.organizationId && userContext.joinedOrgRoles.has(c.organizationId)) {
        const role = userContext.joinedOrgRoles.get(c.organizationId) || 'MEMBER';
        orgAffinityScore =
            exports.FeedRankingConfig.ORGANIZATION_MEMBERSHIP[role] || exports.FeedRankingConfig.ORGANIZATION_MEMBERSHIP.MEMBER;
        signals.organizationAffinity = orgAffinityScore;
        totalScore += orgAffinityScore;
        primaryReason = 'JOINED_ORGANIZATION';
        reasonLabel = `From ${c.organization?.name || 'an organization'} you joined`;
        level = 'DIRECT_RELATIONSHIP';
    }
    else if (c.officialResponses &&
        c.officialResponses.some((r) => userContext.joinedOrgIds.has(r.organizationId))) {
        // Official response from joined organization
        orgAffinityScore = exports.FeedRankingConfig.ORGANIZATION_MEMBERSHIP.MEMBER;
        signals.organizationResponseAffinity = orgAffinityScore;
        totalScore += orgAffinityScore;
        primaryReason = 'OFFICIAL_RESPONSE';
        reasonLabel = 'Official response from an organization you joined';
        level = 'DIRECT_RELATIONSHIP';
    }
    // 3. User Contribution Relationship
    if (userContext.contributedCaseIds.has(c.id)) {
        const contributionTypes = userContext.contributedCaseIds.get(c.id);
        let contribScore = 0;
        if (contributionTypes.has('EVIDENCE'))
            contribScore = Math.max(contribScore, exports.FeedRankingConfig.CONTRIBUTED_CASE.EVIDENCE);
        if (contributionTypes.has('CLAIM'))
            contribScore = Math.max(contribScore, exports.FeedRankingConfig.CONTRIBUTED_CASE.CLAIM);
        if (contributionTypes.has('SOURCE'))
            contribScore = Math.max(contribScore, exports.FeedRankingConfig.CONTRIBUTED_CASE.SOURCE);
        if (contributionTypes.has('DISCUSSION'))
            contribScore = Math.max(contribScore, exports.FeedRankingConfig.CONTRIBUTED_CASE.DISCUSSION);
        signals.userContribution = contribScore;
        totalScore += contribScore;
        if (primaryReason === 'RECOMMENDED') {
            primaryReason = 'USER_CONTRIBUTED';
            reasonLabel = 'Because you contributed to this Case';
            level = 'DIRECT_RELATIONSHIP';
        }
    }
    // 4. Followed Case Affinity
    if (userContext.followedCaseIds.has(c.id)) {
        signals.followedCase = exports.FeedRankingConfig.FOLLOWED_CASE;
        totalScore += signals.followedCase;
        if (primaryReason === 'RECOMMENDED') {
            primaryReason = 'FOLLOWED_CASE';
            reasonLabel = 'Because you follow this Case';
            level = 'DIRECT_RELATIONSHIP';
        }
    }
    // 5. Saved Case Affinity
    if (userContext.savedCaseIds.has(c.id)) {
        signals.savedCase = exports.FeedRankingConfig.SAVED_CASE;
        totalScore += signals.savedCase;
        if (primaryReason === 'RECOMMENDED') {
            primaryReason = 'SAVED_CASE';
            reasonLabel = 'From your saved Cases';
            level = 'DIRECT_RELATIONSHIP';
        }
    }
    // 6. Followed Organization Affinity
    if (c.organizationId && userContext.followedOrgIds.has(c.organizationId)) {
        signals.followedOrganization = exports.FeedRankingConfig.FOLLOWED_ORGANIZATION;
        totalScore += signals.followedOrganization;
        if (primaryReason === 'RECOMMENDED') {
            primaryReason = 'FOLLOWED_ORGANIZATION';
            reasonLabel = `From ${c.organization?.name || 'an organization'} you follow`;
            level = 'DIRECT_RELATIONSHIP';
        }
    }
    // 7. Freshness & Temporal Activity Decay (using lastActivityAt)
    const now = Date.now();
    const lastActive = new Date(c.lastActivityAt || c.updatedAt || c.createdAt).getTime();
    const ageHours = Math.max(0, (now - lastActive) / (1000 * 60 * 60));
    const freshnessMultiplier = Math.exp(-ageHours / exports.FeedRankingConfig.FRESHNESS_HALF_LIFE_HOURS);
    const freshnessScore = freshnessMultiplier * exports.FeedRankingConfig.RECENT_ACTIVITY_WEIGHT;
    signals.freshness = Math.round(freshnessScore * 10) / 10;
    totalScore += signals.freshness;
    // 8. Evidence-First Activity & Civic Depth Signals
    const evidenceCount = c._count.evidence || 0;
    const sourcesCount = c._count.sources || 0;
    const claimsCount = c._count.claims || 0;
    const discussionCount = c._count.discussions || 0;
    const officialResponsesCount = c.officialResponses?.length || 0;
    const evidenceScore = Math.log1p(evidenceCount) * exports.FeedRankingConfig.EVIDENCE_DEPTH_WEIGHT;
    const sourceScore = Math.log1p(sourcesCount) * exports.FeedRankingConfig.SOURCE_DIVERSITY_WEIGHT;
    const claimScore = Math.log1p(claimsCount) * exports.FeedRankingConfig.CLAIM_DEPTH_WEIGHT;
    const discussionScore = Math.log1p(discussionCount) * exports.FeedRankingConfig.DISCUSSION_ACTIVITY_WEIGHT;
    const responseScore = officialResponsesCount > 0 ? exports.FeedRankingConfig.OFFICIAL_RESPONSE_BOOST : 0;
    signals.evidenceDepth = Math.round(evidenceScore * 10) / 10;
    signals.sourceDiversity = Math.round(sourceScore * 10) / 10;
    signals.claimDepth = Math.round(claimScore * 10) / 10;
    signals.discussionActivity = Math.round(discussionScore * 10) / 10;
    signals.officialResponse = responseScore;
    totalScore += evidenceScore + sourceScore + claimScore + discussionScore + responseScore;
    // Build Civic Activity Summary
    if (officialResponsesCount > 0) {
        activitySummary = 'Official response added';
        if (primaryReason === 'RECOMMENDED' || ageHours < 72) {
            primaryReason = 'OFFICIAL_RESPONSE';
            reasonLabel = 'Official response received';
        }
    }
    else if (evidenceCount > 0 && ageHours < 48) {
        activitySummary = 'New evidence and facts verified';
    }
    else if (discussionCount > 0 && ageHours < 24) {
        activitySummary = 'Active community discussion';
    }
    // 9. Topic / Tag Behavioral Affinity
    if (c.tags && c.tags.length > 0 && userContext.engagedTags.size > 0) {
        let tagAffinity = 0;
        c.tags.forEach((t) => {
            const weight = userContext.engagedTags.get(t.tag.normalizedName) || 0;
            tagAffinity += weight;
        });
        if (tagAffinity > 0) {
            const topicScore = Math.min(exports.FeedRankingConfig.TOPIC_AFFINITY_WEIGHT, tagAffinity * 4);
            signals.topicAffinity = topicScore;
            totalScore += topicScore;
            if (primaryReason === 'RECOMMENDED') {
                primaryReason = 'TOPIC_AFFINITY';
                reasonLabel = 'Related to civic topics you engage with';
                if (level === 'EXPLORATION')
                    level = 'BEHAVIORAL_RELEVANCE';
            }
        }
    }
    // 10. Location Relevance (District / City / Division Proximity)
    if (userContext.userLocation || userContext.userCity || userContext.userState) {
        const caseLoc = (c.location || '').toLowerCase();
        const uCity = (userContext.userCity || '').toLowerCase();
        const uLoc = (userContext.userLocation || '').toLowerCase();
        const uState = (userContext.userState || '').toLowerCase();
        let locScore = 0;
        if (uCity && caseLoc.includes(uCity)) {
            locScore = exports.FeedRankingConfig.LOCATION_RELEVANCE.EXACT_CITY;
        }
        else if (uLoc && (caseLoc.includes(uLoc) || uLoc.includes(caseLoc))) {
            locScore = exports.FeedRankingConfig.LOCATION_RELEVANCE.DISTRICT;
        }
        else if (uState && caseLoc.includes(uState)) {
            locScore = exports.FeedRankingConfig.LOCATION_RELEVANCE.STATE;
        }
        if (locScore > 0) {
            signals.locationRelevance = locScore;
            totalScore += locScore;
            if (primaryReason === 'RECOMMENDED') {
                primaryReason = 'LOCAL_RELEVANCE';
                reasonLabel = `Active in ${c.location || 'your area'}`;
                level = 'LOCAL_RECENT';
            }
        }
    }
    // 11. Recent Activity / Trending Velocity
    if (ageHours < 24 && primaryReason === 'RECOMMENDED') {
        primaryReason = 'RECENT_ACTIVITY';
        reasonLabel = 'Recently updated with new activity';
        if (level === 'EXPLORATION')
            level = 'LOCAL_RECENT';
    }
    // 12. Exploration Boost for Cross-Category Discovery
    if (level === 'EXPLORATION') {
        signals.exploration = exports.FeedRankingConfig.EXPLORATION_BOOST;
        totalScore += exports.FeedRankingConfig.EXPLORATION_BOOST;
        if (primaryReason === 'RECOMMENDED') {
            reasonLabel = 'Explore civic case';
        }
    }
    const result = {
        caseId: c.id,
        case: c,
        score: Math.round(totalScore * 10) / 10,
        signals,
        primaryReason,
        reasonLabel,
        activitySummary,
        organizationName: c.organization?.name || null,
        level,
    };
    if (includeDebug) {
        result.debugBreakdown = {
            baseScore: Math.round(totalScore * 10) / 10,
            freshnessDecay: Math.round(freshnessMultiplier * 100) / 100,
            activityScore: Math.round((evidenceScore + sourceScore + responseScore) * 10) / 10,
            relationshipScore: Math.round(orgAffinityScore * 10) / 10,
        };
    }
    return result;
};
exports.scoreCaseForUser = scoreCaseForUser;
/**
 * 9. Multi-Dimensional Content Diversity Algorithm
 * Prevents repetitive clustering of same organization, same author, or same tag.
 */
const applyMultiDimensionalDiversity = (candidates) => {
    const result = [];
    const remaining = [...candidates];
    let consecutiveOrgId = null;
    let consecutiveOrgCount = 0;
    let consecutiveAuthorId = null;
    let consecutiveAuthorCount = 0;
    let consecutivePrimaryTag = null;
    let consecutiveTagCount = 0;
    while (remaining.length > 0) {
        let chosenIndex = 0;
        for (let i = 0; i < remaining.length; i++) {
            const cand = remaining[i];
            const orgId = cand.case.organizationId || 'independent';
            const authorId = cand.case.authorId;
            const primaryTag = cand.case.tags && cand.case.tags.length > 0 ? cand.case.tags[0].tag.normalizedName : null;
            const violatesOrg = consecutiveOrgId === orgId &&
                consecutiveOrgCount >= exports.FeedRankingConfig.DIVERSITY.MAX_CONSECUTIVE_PER_ORG;
            const violatesAuthor = consecutiveAuthorId === authorId &&
                consecutiveAuthorCount >= exports.FeedRankingConfig.DIVERSITY.MAX_CONSECUTIVE_PER_AUTHOR;
            const violatesTag = primaryTag &&
                consecutivePrimaryTag === primaryTag &&
                consecutiveTagCount >= exports.FeedRankingConfig.DIVERSITY.MAX_CONSECUTIVE_PER_TAG;
            if (!violatesOrg && !violatesAuthor && !violatesTag) {
                chosenIndex = i;
                break;
            }
        }
        const chosen = remaining.splice(chosenIndex, 1)[0];
        result.push(chosen);
        // Update consecutive trackers
        const chosenOrg = chosen.case.organizationId || 'independent';
        if (chosenOrg === consecutiveOrgId) {
            consecutiveOrgCount++;
        }
        else {
            consecutiveOrgId = chosenOrg;
            consecutiveOrgCount = 1;
        }
        if (chosen.case.authorId === consecutiveAuthorId) {
            consecutiveAuthorCount++;
        }
        else {
            consecutiveAuthorId = chosen.case.authorId;
            consecutiveAuthorCount = 1;
        }
        const chosenTag = chosen.case.tags && chosen.case.tags.length > 0 ? chosen.case.tags[0].tag.normalizedName : null;
        if (chosenTag && chosenTag === consecutivePrimaryTag) {
            consecutiveTagCount++;
        }
        else {
            consecutivePrimaryTag = chosenTag;
            consecutiveTagCount = 1;
        }
    }
    return result;
};
exports.applyMultiDimensionalDiversity = applyMultiDimensionalDiversity;
