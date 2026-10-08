"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchService = exports.SearchService = void 0;
const prisma_1 = require("../../../lib/prisma");
const search_normalizer_1 = require("./search.normalizer");
const search_intent_1 = require("./search.intent");
const search_permissions_1 = require("./search.permissions");
const search_scorer_1 = require("./search.scorer");
class SearchService {
    /**
     * Main Global Search Method
     */
    async globalSearch(params, currentUserId) {
        const rawQuery = (params.q || '').trim();
        const parsedQuery = (0, search_normalizer_1.normalizeSearchQuery)(rawQuery);
        const intent = (0, search_intent_1.detectSearchIntent)(parsedQuery);
        const viewer = await (0, search_permissions_1.buildSearchViewerContext)(currentUserId);
        const scope = params.scope || 'all';
        const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
        const page = Math.max(1, Number(params.page) || 1);
        const skip = (page - 1) * limit;
        const emptyGroup = () => ({
            items: [],
            total: 0,
            hasMore: false,
        });
        let users = emptyGroup();
        let organizations = emptyGroup();
        let cases = emptyGroup();
        let claims = emptyGroup();
        let evidence = emptyGroup();
        let sources = emptyGroup();
        let discussions = emptyGroup();
        // Query execution based on scope
        const queryPromises = [];
        if (scope === 'all' || scope === 'users') {
            queryPromises.push(this.searchUsers(parsedQuery, params, intent, limit, skip).then(res => { users = res; }));
        }
        if (scope === 'all' || scope === 'organizations') {
            queryPromises.push(this.searchOrganizations(parsedQuery, params, viewer, intent, limit, skip).then(res => { organizations = res; }));
        }
        if (scope === 'all' || scope === 'cases') {
            queryPromises.push(this.searchCases(parsedQuery, params, viewer, intent, limit, skip).then(res => { cases = res; }));
        }
        if (scope === 'all' || scope === 'claims') {
            queryPromises.push(this.searchClaims(parsedQuery, params, viewer, intent, limit, skip).then(res => { claims = res; }));
        }
        if (scope === 'all' || scope === 'evidence') {
            queryPromises.push(this.searchEvidence(parsedQuery, params, viewer, intent, limit, skip).then(res => { evidence = res; }));
        }
        if (scope === 'all' || scope === 'sources') {
            queryPromises.push(this.searchSources(parsedQuery, params, viewer, intent, limit, skip).then(res => { sources = res; }));
        }
        if (scope === 'all' || scope === 'discussions') {
            queryPromises.push(this.searchDiscussions(parsedQuery, params, viewer, intent, limit, skip).then(res => { discussions = res; }));
        }
        await Promise.all(queryPromises);
        return {
            query: rawQuery,
            normalizedQuery: parsedQuery.normalized,
            scope,
            intent: {
                type: intent.type,
                confidence: intent.confidence,
            },
            results: {
                users,
                organizations,
                cases,
                claims,
                evidence,
                sources,
                discussions,
            },
        };
    }
    /**
     * Fast debounced suggestions for Navbar
     */
    async getSuggestions(rawQuery, currentUserId, limit = 8) {
        const query = (rawQuery || '').trim();
        if (!query || query.length < 1) {
            return { query, items: [] };
        }
        const parsedQuery = (0, search_normalizer_1.normalizeSearchQuery)(query);
        const viewer = await (0, search_permissions_1.buildSearchViewerContext)(currentUserId);
        const orgPermissionFilter = (0, search_permissions_1.getOrganizationSearchPermissionFilter)(viewer);
        const casePermissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const items = [];
        const maxPerType = Math.max(2, Math.floor(limit / 3));
        // Parallel lookup
        const [orgs, caseItems, usersList] = await Promise.all([
            prisma_1.db.organization.findMany({
                where: {
                    ...orgPermissionFilter,
                    OR: [
                        { name: { contains: parsedQuery.normalized, mode: 'insensitive' } },
                        { slug: { contains: parsedQuery.normalized, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    organizationType: true,
                    location: true,
                },
                take: maxPerType,
            }),
            prisma_1.db.case.findMany({
                where: {
                    ...casePermissionFilter,
                    OR: [
                        { title: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                        { location: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    location: true,
                    medias: {
                        take: 1,
                        include: { media: true },
                    },
                },
                take: maxPerType,
            }),
            prisma_1.db.user.findMany({
                where: {
                    OR: [
                        { fullName: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                        { userName: { contains: parsedQuery.normalized, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    userProfile: {
                        select: { profilePicture: true, bio: true },
                    },
                },
                take: maxPerType,
            }),
        ]);
        // Format Organizations
        for (const o of orgs) {
            items.push({
                type: 'ORGANIZATION',
                id: o.id,
                title: o.name,
                subtitle: `${o.organizationType}${o.location ? ` • ${o.location}` : ''}`,
                image: o.logoUrl,
                url: `/org/${o.slug}`,
            });
        }
        // Format Cases
        for (const c of caseItems) {
            items.push({
                type: 'CASE',
                id: c.id,
                title: c.title,
                subtitle: `📍 ${c.location}`,
                image: c.medias?.[0]?.media?.url || null,
                url: `/case/${c.id}`,
            });
        }
        // Format Users
        for (const u of usersList) {
            items.push({
                type: 'USER',
                id: u.id,
                title: u.fullName,
                subtitle: u.userName ? `@${u.userName}` : 'Civic Member',
                image: u.userProfile?.profilePicture || null,
                url: u.userName ? `/profile/${u.userName}` : `/profile/${u.id}`,
            });
        }
        return {
            query,
            items: items.slice(0, limit),
        };
    }
    /* =========================================================
       PRIVATE SEARCH HANDLERS
    ========================================================= */
    async searchUsers(parsedQuery, params, intent, limit, skip) {
        const where = {};
        const conditions = [];
        if (parsedQuery.cleanQuery) {
            conditions.push({ fullName: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } });
            conditions.push({ userName: { contains: parsedQuery.normalized, mode: 'insensitive' } });
            conditions.push({
                userProfile: {
                    OR: [
                        { bio: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                        { location: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                    ],
                },
            });
        }
        if (params.location) {
            conditions.push({
                userProfile: { location: { contains: params.location, mode: 'insensitive' } },
            });
        }
        if (conditions.length > 0) {
            where.OR = conditions;
        }
        const [total, rawUsers] = await Promise.all([
            prisma_1.db.user.count({ where }),
            prisma_1.db.user.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    userProfile: {
                        select: {
                            profilePicture: true,
                            bio: true,
                            location: true,
                        },
                    },
                    organizationMemberships: {
                        where: { moderationStatus: 'ACTIVE' },
                        take: 1,
                        include: {
                            organization: {
                                select: { id: true, name: true, slug: true },
                            },
                        },
                    },
                },
                skip,
                take: limit,
            }),
        ]);
        const items = rawUsers.map(u => {
            const topOrg = u.organizationMemberships?.[0];
            const dto = {
                id: u.id,
                fullName: u.fullName,
                userName: u.userName,
                profilePicture: u.userProfile?.profilePicture || null,
                bio: u.userProfile?.bio || null,
                location: u.userProfile?.location || null,
                organizationAffiliation: topOrg ? {
                    id: topOrg.organization.id,
                    name: topOrg.organization.name,
                    slug: topOrg.organization.slug,
                    role: topOrg.role,
                } : null,
                url: u.userName ? `/profile/${u.userName}` : `/profile/${u.id}`,
            };
            dto.score = (0, search_scorer_1.scoreUser)({
                fullName: u.fullName,
                userName: u.userName,
                bio: u.userProfile?.bio,
                location: u.userProfile?.location,
            }, parsedQuery, intent);
            return dto;
        });
        if (params.sortBy !== 'recent') {
            items.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchOrganizations(parsedQuery, params, viewer, intent, limit, skip) {
        const permissionFilter = (0, search_permissions_1.getOrganizationSearchPermissionFilter)(viewer);
        const where = { ...permissionFilter };
        const conditions = [];
        if (parsedQuery.cleanQuery) {
            conditions.push({ name: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } });
            conditions.push({ slug: { contains: parsedQuery.normalized, mode: 'insensitive' } });
            conditions.push({ description: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } });
            conditions.push({ location: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } });
        }
        if (params.location) {
            where.location = { contains: params.location, mode: 'insensitive' };
        }
        if (params.organizationType) {
            where.organizationType = params.organizationType;
        }
        if (conditions.length > 0) {
            where.AND = [{ OR: conditions }];
        }
        const [total, rawOrgs] = await Promise.all([
            prisma_1.db.organization.count({ where }),
            prisma_1.db.organization.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    organizationType: true,
                    verificationStatus: true,
                    location: true,
                    logoUrl: true,
                    _count: {
                        select: {
                            memberships: true,
                            cases: true,
                        },
                    },
                },
                skip,
                take: limit,
            }),
        ]);
        const items = rawOrgs.map(o => {
            const dto = {
                id: o.id,
                name: o.name,
                slug: o.slug,
                description: o.description,
                organizationType: o.organizationType,
                verificationStatus: o.verificationStatus,
                location: o.location,
                logoUrl: o.logoUrl,
                memberCount: o._count.memberships,
                caseCount: o._count.cases,
                url: `/org/${o.slug}`,
            };
            dto.score = (0, search_scorer_1.scoreOrganization)({
                name: o.name,
                slug: o.slug,
                description: o.description,
                location: o.location,
            }, parsedQuery, intent);
            return dto;
        });
        if (params.sortBy === 'most_members') {
            items.sort((a, b) => b.memberCount - a.memberCount);
        }
        else if (params.sortBy !== 'recent') {
            items.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchCases(parsedQuery, params, viewer, intent, limit, skip) {
        const permissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const where = { ...permissionFilter };
        if (params.location) {
            where.location = { contains: params.location, mode: 'insensitive' };
        }
        if (params.organizationId) {
            where.organizationId = params.organizationId;
        }
        if (params.status) {
            where.caseStatus = params.status;
        }
        if (params.dateFrom || params.dateTo) {
            where.createdAt = {};
            if (params.dateFrom)
                where.createdAt.gte = new Date(params.dateFrom);
            if (params.dateTo)
                where.createdAt.lte = new Date(params.dateTo);
        }
        if (parsedQuery.cleanQuery) {
            where.OR = [
                { title: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                { location: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                {
                    claims: {
                        some: {
                            title: { contains: parsedQuery.cleanQuery, mode: 'insensitive' },
                        },
                    },
                },
                {
                    tags: {
                        some: {
                            tag: {
                                name: { contains: parsedQuery.cleanQuery, mode: 'insensitive' },
                            },
                        },
                    },
                },
            ];
        }
        const [total, rawCases] = await Promise.all([
            prisma_1.db.case.count({ where }),
            prisma_1.db.case.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            fullName: true,
                            userName: true,
                            userProfile: { select: { profilePicture: true } },
                        },
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            logoUrl: true,
                            verificationStatus: true,
                        },
                    },
                    claims: {
                        select: { id: true, title: true },
                        take: 3,
                    },
                    tags: {
                        include: { tag: true },
                    },
                    _count: {
                        select: {
                            claims: true,
                            evidence: true,
                            sources: true,
                            discussions: true,
                            caseReactions: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: params.sortBy === 'recent'
                    ? { createdAt: 'desc' }
                    : params.sortBy === 'most_active'
                        ? { lastActivityAt: 'desc' }
                        : undefined,
            }),
        ]);
        const items = rawCases.map(c => {
            // Check if matched claim
            let matchedClaim = null;
            if (parsedQuery.cleanQuery && c.claims) {
                const found = c.claims.find(cl => cl.title.toLowerCase().includes(parsedQuery.normalized) ||
                    parsedQuery.tokens.some((t) => cl.title.toLowerCase().includes(t.toLowerCase())));
                if (found) {
                    matchedClaim = { id: found.id, title: found.title };
                }
            }
            const authorSanitized = (0, search_permissions_1.sanitizeAnonymousAuthor)(c.isAnonymous, c.author);
            const dto = {
                id: c.id,
                title: c.title,
                titleHtml: c.titleHtml,
                location: c.location,
                caseStatus: c.caseStatus,
                visibility: c.visibility,
                lastActivityAt: c.lastActivityAt.toISOString(),
                createdAt: c.createdAt.toISOString(),
                isAnonymous: c.isAnonymous,
                author: authorSanitized,
                organization: c.organization ? {
                    id: c.organization.id,
                    name: c.organization.name,
                    slug: c.organization.slug,
                    logoUrl: c.organization.logoUrl,
                    verificationStatus: c.organization.verificationStatus,
                } : null,
                stats: {
                    claimsCount: c._count.claims,
                    evidenceCount: c._count.evidence,
                    sourcesCount: c._count.sources,
                    discussionsCount: c._count.discussions,
                    reactionsCount: c._count.caseReactions,
                },
                matchedContext: {
                    matchedClaim,
                },
                url: `/case/${c.id}`,
            };
            dto.score = (0, search_scorer_1.scoreCase)({
                title: c.title,
                location: c.location,
                createdAt: c.createdAt,
                lastActivityAt: c.lastActivityAt,
                claims: c.claims,
                tags: c.tags,
                evidenceCount: c._count.evidence,
                sourcesCount: c._count.sources,
                discussionsCount: c._count.discussions,
            }, parsedQuery, intent);
            return dto;
        });
        if (params.sortBy !== 'recent' && params.sortBy !== 'most_active') {
            items.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchClaims(parsedQuery, params, viewer, intent, limit, skip) {
        const casePermissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const where = {
            case: casePermissionFilter,
        };
        if (parsedQuery.cleanQuery) {
            where.title = { contains: parsedQuery.cleanQuery, mode: 'insensitive' };
        }
        const [total, rawClaims] = await Promise.all([
            prisma_1.db.claim.count({ where }),
            prisma_1.db.claim.findMany({
                where,
                include: {
                    case: {
                        select: {
                            id: true,
                            title: true,
                            location: true,
                            organization: { select: { name: true } },
                        },
                    },
                    _count: {
                        select: {
                            assessments: true,
                            evidence: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const items = rawClaims.map(cl => ({
            id: cl.id,
            title: cl.title,
            claimType: cl.claimType,
            claimStatus: cl.claimStatus,
            createdAt: cl.createdAt.toISOString(),
            isAnonymous: cl.isAnonymous,
            parentCase: {
                id: cl.case.id,
                title: cl.case.title,
                location: cl.case.location,
                organizationName: cl.case.organization?.name || null,
                url: `/case/${cl.case.id}`,
            },
            assessmentsCount: cl._count.assessments,
            evidenceCount: cl._count.evidence,
            url: `/case/${cl.case.id}?claim=${cl.id}`,
        }));
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchEvidence(parsedQuery, params, viewer, intent, limit, skip) {
        const casePermissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const where = {
            cases: {
                some: {
                    case: casePermissionFilter,
                },
            },
        };
        if (parsedQuery.cleanQuery) {
            where.title = { contains: parsedQuery.cleanQuery, mode: 'insensitive' };
        }
        if (params.evidenceType) {
            where.type = params.evidenceType;
        }
        const [total, rawEvidence] = await Promise.all([
            prisma_1.db.evidence.count({ where }),
            prisma_1.db.evidence.findMany({
                where,
                include: {
                    cases: {
                        take: 1,
                        include: {
                            case: {
                                select: { id: true, title: true, location: true },
                            },
                        },
                    },
                    claims: {
                        take: 1,
                        include: {
                            claim: {
                                select: { id: true, title: true },
                            },
                        },
                    },
                    _count: {
                        select: { validations: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const items = rawEvidence
            .filter(e => e.cases.length > 0 && e.cases[0].case)
            .map(e => {
            const parentCase = e.cases[0].case;
            const relatedClaim = e.claims?.[0]?.claim;
            return {
                id: e.id,
                title: e.title,
                type: e.type,
                createdAt: e.createdAt.toISOString(),
                isAnonymous: e.isAnonymous,
                parentCase: {
                    id: parentCase.id,
                    title: parentCase.title,
                    location: parentCase.location,
                    url: `/case/${parentCase.id}`,
                },
                relatedClaim: relatedClaim ? {
                    id: relatedClaim.id,
                    title: relatedClaim.title,
                } : null,
                validationsCount: e._count.validations,
                url: `/case/${parentCase.id}?evidence=${e.id}`,
            };
        });
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchSources(parsedQuery, params, viewer, intent, limit, skip) {
        const casePermissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const where = {
            cases: {
                some: {
                    case: casePermissionFilter,
                },
            },
        };
        if (parsedQuery.cleanQuery) {
            where.OR = [
                { title: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                { externalSourceName: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
                { sourceLocation: { contains: parsedQuery.cleanQuery, mode: 'insensitive' } },
            ];
        }
        if (params.sourceType) {
            where.externalSourceType = params.sourceType;
        }
        const [total, rawSources] = await Promise.all([
            prisma_1.db.source.count({ where }),
            prisma_1.db.source.findMany({
                where,
                include: {
                    cases: {
                        take: 1,
                        include: {
                            case: {
                                select: { id: true, title: true },
                            },
                        },
                    },
                    claims: {
                        take: 1,
                        include: {
                            claim: {
                                select: { id: true, title: true },
                            },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const items = rawSources
            .filter(s => s.cases.length > 0 && s.cases[0].case)
            .map(s => {
            const parentCase = s.cases[0].case;
            const relatedClaim = s.claims?.[0]?.claim;
            return {
                id: s.id,
                title: s.title,
                publisher: s.externalSourceName,
                sourceLocation: s.sourceLocation,
                externalSourceType: s.externalSourceType,
                externalLinks: s.externalLinks,
                createdAt: s.createdAt.toISOString(),
                parentCase: {
                    id: parentCase.id,
                    title: parentCase.title,
                    url: `/case/${parentCase.id}`,
                },
                relatedClaim: relatedClaim ? {
                    id: relatedClaim.id,
                    title: relatedClaim.title,
                } : null,
                url: `/case/${parentCase.id}?source=${s.id}`,
            };
        });
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
    async searchDiscussions(parsedQuery, params, viewer, intent, limit, skip) {
        const casePermissionFilter = (0, search_permissions_1.getCaseSearchPermissionFilter)(viewer);
        const where = {
            case: casePermissionFilter,
        };
        if (parsedQuery.cleanQuery) {
            where.content = { contains: parsedQuery.cleanQuery, mode: 'insensitive' };
        }
        const [total, rawDiscussions] = await Promise.all([
            prisma_1.db.discussion.count({ where }),
            prisma_1.db.discussion.findMany({
                where,
                include: {
                    case: {
                        select: { id: true, title: true },
                    },
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            userName: true,
                            userProfile: { select: { profilePicture: true } },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const items = rawDiscussions.map(d => {
            const author = (0, search_permissions_1.sanitizeAnonymousAuthor)(d.isAnonymous, d.user);
            const snippet = d.content.length > 180 ? `${d.content.substring(0, 180)}...` : d.content;
            return {
                id: d.id,
                snippet,
                createdAt: d.createdAt.toISOString(),
                isAnonymous: d.isAnonymous,
                author: {
                    name: author.name,
                    avatarUrl: author.avatarUrl,
                },
                parentCase: {
                    id: d.case.id,
                    title: d.case.title,
                    url: `/case/${d.case.id}`,
                },
                url: `/case/${d.case.id}#discussion-${d.id}`,
            };
        });
        return {
            items,
            total,
            hasMore: skip + items.length < total,
        };
    }
}
exports.SearchService = SearchService;
exports.searchService = new SearchService();
