"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../lib/prisma");
const media_service_1 = __importDefault(require("../media/media.service"));
const hashtag_utils_1 = require("../../lib/hashtag.utils");
/* =========================================================
   CREATE CASE
   Case
   └── First Claim
       ├── Evidence
       └── Sources
========================================================= */
const createNewCase = async (caseData, author, files = []) => {
    return prisma_1.db.$transaction(async (tx) => {
        /* =====================================================
           1.5 HASHTAGS (Extract before we strip them from text)
        ===================================================== */
        // Use plain text for extraction to avoid HTML color codes like #ffffff
        const contentTags = (0, hashtag_utils_1.extractHashtags)(caseData.title || (caseData.titleHtml ? caseData.titleHtml.replace(/<[^>]+>/g, '') : ''));
        const explicitTags = (caseData.tags || []).map(t => (0, hashtag_utils_1.normalizeHashtag)(t));
        const allTags = [...new Set([...contentTags, ...explicitTags])].filter(Boolean);
        /* =====================================================
           1. CREATE CASE
        ===================================================== */
        const cleanTitleHtml = (0, hashtag_utils_1.removeHashtags)(caseData.titleHtml, allTags);
        const cleanTitle = (0, hashtag_utils_1.removeHashtags)(caseData.title, allTags);
        const newCase = await tx.case.create({
            data: {
                title: cleanTitle,
                titleHtml: cleanTitleHtml,
                location: caseData.location,
                authorId: author,
                caseStatus: "SHOW",
                isAnonymous: caseData.isAnonymous || false,
                canUserCreateClaim: typeof caseData.canUserCreateClaim === "boolean" ? caseData.canUserCreateClaim : true,
                canUserCreateClaimEvidence: typeof caseData.canUserCreateClaimEvidence === "boolean" ? caseData.canUserCreateClaimEvidence : true,
                canUserCreateClaimUpdate: typeof caseData.canUserCreateClaimUpdate === "boolean" ? caseData.canUserCreateClaimUpdate : true,
            },
        });
        if (caseData.organizationId) {
            await tx.officialResponse.create({
                data: {
                    organizationId: caseData.organizationId,
                    caseId: newCase.id,
                    representativeId: author,
                    content: "Case reported to organization",
                }
            });
        }
        /* =====================================================
           1.5 HASHTAGS
        ===================================================== */
        for (const normalizedName of allTags) {
            // We use the originally typed name for display if available, else normalized
            const originalName = caseData.tags?.find(t => (0, hashtag_utils_1.normalizeHashtag)(t) === normalizedName) ||
                (caseData.titleHtml || caseData.title).match(new RegExp(`#(${normalizedName})`, 'i'))?.[1] ||
                normalizedName;
            const tag = await tx.tag.upsert({
                where: { normalizedName },
                update: {},
                create: {
                    name: originalName,
                    normalizedName,
                }
            });
            await tx.caseTag.create({
                data: {
                    caseId: newCase.id,
                    tagId: tag.id,
                }
            });
        }
        /* =====================================================
           2. CASE MEDIA
        ===================================================== */
        const caseMedias = await media_service_1.default.processAndCreateMedia(tx, files, "caseMedia");
        for (const { mediaId, order } of caseMedias) {
            await tx.caseMedia.create({
                data: {
                    caseId: newCase.id,
                    mediaId,
                    order,
                },
            });
        }
        /* =====================================================
           3. CREATE FIRST CLAIM
        ===================================================== */
        if (!caseData.claims) {
            return newCase;
        }
        const newClaim = await tx.claim.create({
            data: {
                title: caseData.claims.title,
                claimStatus: "SHOW",
                caseId: newCase.id,
                createdBy: author,
                claimType: "BASIC",
                isAnonymous: caseData.claims.isAnonymous || false,
            },
        });
        /* =====================================================
           4. CLAIM MEDIA
        ===================================================== */
        const claimMedias = await media_service_1.default.processAndCreateMedia(tx, files, "claimMedia");
        for (const { mediaId, order } of claimMedias) {
            await tx.claimMedia.create({
                data: {
                    claimId: newClaim.id,
                    mediaId,
                    order,
                },
            });
        }
        /* =====================================================
           5. CREATE EVIDENCE
        ===================================================== */
        const evidences = caseData.claims.evidence ?? [];
        for (let index = 0; index < evidences.length; index++) {
            const evidence = evidences[index];
            const newEvidence = await tx.evidence.create({
                data: {
                    title: evidence.title,
                    type: evidence.type,
                    submittedBy: author,
                    isAnonymous: evidence.isAnonymous || false,
                },
            });
            /* Claim ↔ Evidence */
            await tx.claimEvidence.create({
                data: {
                    claimId: newClaim.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });
            /* Evidence Media */
            const evidenceMedias = await media_service_1.default.processAndCreateMedia(tx, files, `evidenceMedia_${index}`);
            for (const { mediaId, order } of evidenceMedias) {
                await tx.evidenceMedia.create({
                    data: {
                        evidenceId: newEvidence.id,
                        mediaId,
                        order,
                    },
                });
            }
        }
        /* =====================================================
           6. CREATE SOURCES
        ===================================================== */
        const sources = caseData.claims.sources ?? [];
        for (const source of sources) {
            const newSource = await tx.source.create({
                data: {
                    title: source.title,
                    sourceLocation: source.sourceLocation,
                    sourceDate: source.sourceDate
                        ? new Date(source.sourceDate)
                        : null,
                    externalSourceType: source.externalSourceType,
                    externalSourceName: source.externalSourceName,
                    externalLinks: source.externalLinks,
                    createdBy: author,
                    isAnonymous: source.isAnonymous || false,
                },
            });
            /* Claim ↔ Source */
            await tx.claimSource.create({
                data: {
                    claimId: newClaim.id,
                    sourceId: newSource.id,
                    relationship: source.relationship,
                },
            });
        }
        /* =====================================================
           RETURN
        ===================================================== */
        return newCase;
    });
};
const ranking_config_1 = require("./ranking.config");
/* =========================================================
   RECORD CASE VIEW
========================================================= */
const recordCaseView = async (caseId, userId, visitorKey) => {
    const timeWindow = new Date(Date.now() - ranking_config_1.RANKING_CONFIG.VIEW_DEDUP_WINDOW_MINUTES * 60 * 1000);
    let existingView = null;
    if (userId) {
        existingView = await prisma_1.db.caseView.findFirst({
            where: { caseId, userId, createdAt: { gte: timeWindow } }
        });
    }
    else if (visitorKey) {
        existingView = await prisma_1.db.caseView.findFirst({
            where: { caseId, visitorKey, createdAt: { gte: timeWindow } }
        });
    }
    if (existingView)
        return { recorded: false, reason: "deduplicated" };
    await prisma_1.db.caseView.create({
        data: { caseId, userId, visitorKey }
    });
    return { recorded: true };
};
/* =========================================================
   GET NEWS FEED
========================================================= */
const feed_service_1 = require("../feed/feed.service");
const getNewsFeed = async (tag, author, currentUserId, sort = 'recent', page = 1, limit = 10) => {
    return feed_service_1.feedService.getNewsFeed({
        userId: currentUserId,
        sort,
        page,
        limit,
        tag,
        author,
        config: ranking_config_1.RANKING_CONFIG
    });
};
const _oldGetNewsFeed = async (tag, author, currentUserId) => {
    const whereClause = {
        caseStatus: "SHOW",
    };
    if (tag) {
        whereClause.tags = {
            some: {
                tag: {
                    normalizedName: tag.toLowerCase()
                }
            }
        };
    }
    if (author) {
        whereClause.author = {
            userName: { equals: author, mode: 'insensitive' }
        };
    }
    const result = await prisma_1.db.case.findMany({
        where: whereClause,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            /* =========================
               AUTHOR
            ========================= */
            author: {
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    userProfile: true,
                },
            },
            _count: {
                select: {
                    claims: true,
                    discussions: true,
                }
            },
            /* =========================
               CLAIMS
            ========================= */
            claims: {
                where: {
                    claimStatus: "SHOW",
                },
                orderBy: {
                    createdAt: "asc",
                },
                take: 1,
                select: {
                    id: true,
                    title: true,
                    claimType: true,
                    createdAt: true,
                    _count: {
                        select: {
                            evidence: true,
                            sources: true,
                        }
                    }
                },
            },
            /* =========================
               CASE MEDIA
            ========================= */
            medias: {
                include: {
                    media: true,
                },
                orderBy: {
                    order: "asc",
                },
            },
            /* =========================
               CASE TAGS
            ========================= */
            tags: {
                include: {
                    tag: true,
                },
            },
            caseReactions: true,
        },
    });
    return result.map(caseItem => {
        let support = 0;
        let oppose = 0;
        let currentUserReaction = null;
        if (caseItem.caseReactions) {
            caseItem.caseReactions.forEach((reaction) => {
                if (reaction.value === "SUPPORT")
                    support++;
                if (reaction.value === "OPPOSE")
                    oppose++;
                if (currentUserId && reaction.userId === currentUserId) {
                    currentUserReaction = reaction.value;
                }
            });
        }
        const { caseReactions, ...rest } = caseItem;
        return {
            ...rest,
            reaction: {
                support,
                oppose,
                total: support + oppose,
                currentUserReaction
            }
        };
    });
};
/* =========================================================
   GET CASE DETAILS
========================================================= */
const getCaseDetails = async (id, currentUserId) => {
    const result = await prisma_1.db.case.findUnique({
        where: {
            id,
        },
        include: {
            /* =========================
               AUTHOR
            ========================= */
            author: {
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    userProfile: true,
                },
            },
            /* =========================
               CASE MEDIA
            ========================= */
            medias: {
                include: {
                    media: true,
                },
                orderBy: {
                    order: "asc",
                },
            },
            /* =========================
               CASE TAGS
            ========================= */
            tags: {
                include: {
                    tag: true,
                },
            },
            /* =========================
               CLAIMS
            ========================= */
            claims: {
                where: {
                    claimStatus: "SHOW",
                },
                orderBy: {
                    createdAt: "asc",
                },
                include: {
                    /* =========================
                       CLAIM MEDIA
                    ========================= */
                    medias: {
                        include: {
                            media: true,
                        },
                        orderBy: {
                            order: "asc",
                        },
                    },
                    creator: {
                        select: {
                            id: true,
                            fullName: true,
                            userName: true,
                            userProfile: true,
                        },
                    },
                    /* =========================
                       EVIDENCE
                    ========================= */
                    evidence: {
                        include: {
                            evidence: {
                                include: {
                                    medias: {
                                        include: {
                                            media: true,
                                        },
                                        orderBy: {
                                            order: "asc",
                                        },
                                    },
                                    submitter: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            userName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    /* =========================
                       SOURCES
                    ========================= */
                    sources: {
                        include: {
                            source: {
                                include: {
                                    creator: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            userName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    /* =========================
                       ASSESSMENTS
                    ========================= */
                    assessments: true,
                    /* =========================
                       DISCUSSIONS
                    ========================= */
                    discussions: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            },
            /* =========================
               CASE DISCUSSIONS
            ========================= */
            discussions: {
                orderBy: {
                    createdAt: "asc",
                },
            },
            evidence: {
                include: {
                    evidence: {
                        include: {
                            medias: {
                                include: { media: true },
                                orderBy: { order: "asc" }
                            }
                        }
                    }
                }
            },
            sources: {
                include: { source: true }
            },
            caseReactions: true,
        },
    });
    if (!result) {
        throw new Error("Case not found");
    }
    let support = 0;
    let oppose = 0;
    let currentUserReaction = null;
    if (result.caseReactions) {
        result.caseReactions.forEach((reaction) => {
            if (reaction.value === "SUPPORT")
                support++;
            if (reaction.value === "OPPOSE")
                oppose++;
            if (currentUserId && reaction.userId === currentUserId) {
                currentUserReaction = reaction.value;
            }
        });
    }
    const rawCaseDetail = {
        ...result,
        settings: {
            canUserCreateClaim: result.canUserCreateClaim ?? true,
            canUserCreateClaimEvidence: result.canUserCreateClaimEvidence ?? true,
            canUserCreateClaimUpdate: result.canUserCreateClaimUpdate ?? true,
        },
        reaction: {
            support,
            oppose,
            total: support + oppose,
            currentUserReaction
        },
        caseReactions: undefined
    };
    const { sanitizeAnonymousCase } = require('../../utils/privacy.utils');
    return sanitizeAnonymousCase(rawCaseDetail);
};
/* =========================================================
   CREATE CLAIM
========================================================= */
const createClaim = async (caseId, claimData, author, files = []) => {
    return prisma_1.db.$transaction(async (tx) => {
        /* =====================================================
           1. CHECK CASE
        ===================================================== */
        const existingCase = await tx.case.findUnique({
            where: {
                id: caseId,
            },
        });
        if (!existingCase) {
            throw new Error("Case not found");
        }
        if (existingCase.caseStatus !== "SHOW") {
            throw new Error("Case is not available");
        }
        if (existingCase.canUserCreateClaim === false && existingCase.authorId !== author) {
            const error = new Error("Claim creation is disabled for this case");
            error.statusCode = 403;
            throw error;
        }
        if (existingCase.authorId !== author) {
            const existingClaim = await tx.claim.findFirst({
                where: {
                    caseId: caseId,
                    createdBy: author,
                },
            });
            if (existingClaim) {
                throw new Error("You can only create one claim per case");
            }
        }
        /* =====================================================
           2. CREATE CLAIM
        ===================================================== */
        const newClaim = await tx.claim.create({
            data: {
                title: claimData.title,
                claimStatus: "SHOW",
                caseId,
                createdBy: author,
                claimType: "BASIC",
                isAnonymous: claimData.isAnonymous || false,
            },
        });
        /* =====================================================
           3. CLAIM MEDIA
        ===================================================== */
        const claimMedias = await media_service_1.default.processAndCreateMedia(tx, files, "claimMedia");
        for (const { mediaId, order } of claimMedias) {
            await tx.claimMedia.create({
                data: {
                    claimId: newClaim.id,
                    mediaId,
                    order,
                },
            });
        }
        /* =====================================================
           4. CREATE EVIDENCE
        ===================================================== */
        const evidences = claimData.evidence ?? [];
        for (let index = 0; index < evidences.length; index++) {
            const evidence = evidences[index];
            const newEvidence = await tx.evidence.create({
                data: {
                    title: evidence.title,
                    type: evidence.type,
                    submittedBy: author,
                    isAnonymous: evidence.isAnonymous || false,
                },
            });
            /* Claim ↔ Evidence */
            await tx.claimEvidence.create({
                data: {
                    claimId: newClaim.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });
            /* Evidence Media */
            const evidenceMedias = await media_service_1.default.processAndCreateMedia(tx, files, `evidenceMedia_${index}`);
            for (const { mediaId, order } of evidenceMedias) {
                await tx.evidenceMedia.create({
                    data: {
                        evidenceId: newEvidence.id,
                        mediaId,
                        order,
                    },
                });
            }
        }
        /* =====================================================
           5. CREATE SOURCES
        ===================================================== */
        const sources = claimData.sources ?? [];
        for (const source of sources) {
            const newSource = await tx.source.create({
                data: {
                    title: source.title,
                    sourceLocation: source.sourceLocation,
                    sourceDate: source.sourceDate
                        ? new Date(source.sourceDate)
                        : null,
                    externalSourceType: source.externalSourceType,
                    externalSourceName: source.externalSourceName,
                    externalLinks: source.externalLinks,
                    createdBy: author,
                    isAnonymous: source.isAnonymous || false,
                },
            });
            /* Claim ↔ Source */
            await tx.claimSource.create({
                data: {
                    claimId: newClaim.id,
                    sourceId: newSource.id,
                    relationship: source.relationship,
                },
            });
        }
        /* =====================================================
           RETURN
        ===================================================== */
        return newClaim;
    });
};
const addEvidenceToClaim = async (claimId, payload, author, files = []) => {
    return prisma_1.db.$transaction(async (tx) => {
        // 1. CHECK CLAIM
        const existingClaim = await tx.claim.findUnique({
            where: { id: claimId },
            include: { case: true }
        });
        if (!existingClaim) {
            throw new Error("Claim not found");
        }
        if (existingClaim.case.canUserCreateClaimEvidence === false && existingClaim.case.authorId !== author) {
            const error = new Error("Adding evidence to claims is disabled for this case");
            error.statusCode = 403;
            throw error;
        }
        // 2. ADD EVIDENCE
        const evidences = payload.evidence ?? [];
        for (let index = 0; index < evidences.length; index++) {
            const evidence = evidences[index];
            const newEvidence = await tx.evidence.create({
                data: {
                    title: evidence.title,
                    type: evidence.type,
                    submittedBy: author,
                    isAnonymous: evidence.isAnonymous || false,
                },
            });
            await tx.claimEvidence.create({
                data: {
                    claimId: existingClaim.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });
            const evidenceMedias = await media_service_1.default.processAndCreateMedia(tx, files, `evidenceMedia_${index}`);
            for (const { mediaId, order } of evidenceMedias) {
                await tx.evidenceMedia.create({
                    data: {
                        evidenceId: newEvidence.id,
                        mediaId,
                        order,
                    },
                });
            }
        }
        // 3. ADD SOURCES
        const sources = payload.sources ?? [];
        for (const source of sources) {
            const newSource = await tx.source.create({
                data: {
                    title: source.title,
                    sourceLocation: source.sourceLocation,
                    sourceDate: source.sourceDate ? new Date(source.sourceDate) : null,
                    externalSourceType: source.externalSourceType,
                    externalSourceName: source.externalSourceName,
                    externalLinks: source.externalLinks,
                    createdBy: author,
                    isAnonymous: source.isAnonymous || false,
                },
            });
            await tx.claimSource.create({
                data: {
                    claimId: existingClaim.id,
                    sourceId: newSource.id,
                    relationship: source.relationship,
                },
            });
        }
        return existingClaim;
    });
};
/* =========================================================
   ADD EVIDENCE TO CASE
========================================================= */
const addEvidenceToCase = async (caseId, payload, author, files = []) => {
    return prisma_1.db.$transaction(async (tx) => {
        // 1. CHECK CASE
        const existingCase = await tx.case.findUnique({
            where: { id: caseId },
        });
        if (!existingCase) {
            throw new Error("Case not found");
        }
        // 2. ADD EVIDENCE
        const evidences = payload.evidence ?? [];
        for (let index = 0; index < evidences.length; index++) {
            const evidence = evidences[index];
            const newEvidence = await tx.evidence.create({
                data: {
                    title: evidence.title,
                    type: evidence.type,
                    submittedBy: author,
                    isAnonymous: evidence.isAnonymous || false,
                },
            });
            await tx.caseEvidence.create({
                data: {
                    caseId: existingCase.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });
            const evidenceMedias = await media_service_1.default.processAndCreateMedia(tx, files, `evidenceMedia_${index}`);
            for (const { mediaId, order } of evidenceMedias) {
                await tx.evidenceMedia.create({
                    data: {
                        evidenceId: newEvidence.id,
                        mediaId,
                        order,
                    },
                });
            }
        }
        // 3. ADD SOURCES
        const sources = payload.sources ?? [];
        for (const source of sources) {
            const newSource = await tx.source.create({
                data: {
                    title: source.title,
                    sourceLocation: source.sourceLocation,
                    sourceDate: source.sourceDate ? new Date(source.sourceDate) : null,
                    externalSourceType: source.externalSourceType,
                    externalSourceName: source.externalSourceName,
                    externalLinks: source.externalLinks,
                    createdBy: author,
                    isAnonymous: source.isAnonymous || false,
                },
            });
            await tx.caseSource.create({
                data: {
                    caseId: existingCase.id,
                    sourceId: newSource.id,
                    relationship: source.relationship,
                },
            });
        }
        return existingCase;
    });
};
/* =========================================================
   SUBMIT ASSESSMENT
========================================================= */
const submitAssessment = async (claimId, authorId, payload) => {
    return prisma_1.db.$transaction(async (tx) => {
        const existing = await tx.assessment.findUnique({
            where: {
                claimId_userId: {
                    claimId,
                    userId: authorId
                }
            }
        });
        if (existing) {
            return tx.assessment.update({
                where: {
                    id: existing.id
                },
                data: {
                    assessment: payload.assessment,
                    isAnonymous: payload.isAnonymous
                }
            });
        }
        return tx.assessment.create({
            data: {
                claimId,
                userId: authorId,
                assessment: payload.assessment,
                isAnonymous: payload.isAnonymous
            }
        });
    });
};
/* =========================================================
   GET ASSESSMENTS
========================================================= */
const getAssessments = async (claimId, authorId) => {
    const assessments = await prisma_1.db.assessment.findMany({
        where: { claimId },
        include: {
            user: {
                include: {
                    userProfile: true
                }
            }
        }
    });
    const total = assessments.length;
    let support = 0;
    let neutral = 0;
    let opposition = 0;
    let currentUserPosition = null;
    const formattedAssessments = assessments.map(a => {
        if (a.assessment === 'SUPPORTED')
            support++;
        if (a.assessment === 'INSUFFICIENT_EVIDENCE' || a.assessment === 'PARTIALLY_SUPPORTED')
            neutral++;
        if (a.assessment === 'CONTRADICTED' || a.assessment === 'DISPUTED')
            opposition++;
        if (authorId && a.userId === authorId) {
            currentUserPosition = a.assessment;
        }
        return {
            id: a.id,
            assessment: a.assessment,
            createdAt: a.createdAt,
            user: a.isAnonymous ? { fullName: 'Anonymous', userName: 'Anonymous' } : a.user
        };
    });
    return {
        total,
        support,
        neutral,
        opposition,
        currentUserPosition,
        assessments: formattedAssessments
    };
};
/* =========================================================
   CASE REACTIONS
========================================================= */
const submitCaseReaction = async (caseId, userId, reactionData) => {
    // Check if case exists
    const caseRecord = await prisma_1.db.case.findUnique({
        where: { id: caseId }
    });
    if (!caseRecord) {
        throw new Error("Case not found");
    }
    if (reactionData.value === "NONE") {
        await prisma_1.db.caseReaction.deleteMany({
            where: {
                caseId,
                userId
            }
        });
    }
    else {
        await prisma_1.db.caseReaction.upsert({
            where: {
                caseId_userId: {
                    caseId,
                    userId
                }
            },
            update: {
                value: reactionData.value
            },
            create: {
                caseId,
                userId,
                value: reactionData.value
            }
        });
    }
    // Recalculate counts
    const counts = await prisma_1.db.caseReaction.groupBy({
        by: ['value'],
        where: { caseId },
        _count: { value: true }
    });
    let support = 0;
    let oppose = 0;
    counts.forEach(count => {
        if (count.value === "SUPPORT")
            support = count._count.value;
        if (count.value === "OPPOSE")
            oppose = count._count.value;
    });
    const total = support + oppose;
    const currentUserReaction = reactionData.value === "NONE" ? null : reactionData.value;
    return {
        support,
        oppose,
        total,
        currentUserReaction
    };
};
/* =========================================================
   CLAIM UPDATES & TIMELINE SERVICE
========================================================= */
const getClaimUpdatePermissions = async (claimId, userId) => {
    const claim = await prisma_1.db.claim.findUnique({
        where: { id: claimId },
        include: { case: { select: { authorId: true, canUserCreateClaimUpdate: true } } }
    });
    if (!claim) {
        const error = new Error("Claim not found");
        error.statusCode = 404;
        throw error;
    }
    const isDirectCaseClaim = claim.createdBy === claim.case.authorId || claim.claimType === "DIRECT_CASE";
    const isCaseAuthor = Boolean(userId && claim.case.authorId === userId);
    const canAddUpdate = Boolean(userId) && (claim.case.canUserCreateClaimUpdate || isCaseAuthor);
    return {
        canAddUpdate,
        isDirectCaseClaim,
        claimId,
        currentState: claim.currentState || "PROPOSED"
    };
};
const createClaimUpdate = async (claimId, data, userId, files = []) => {
    const { sanitizeAnonymousClaimUpdate } = require('../../utils/privacy.utils');
    return prisma_1.db.$transaction(async (tx) => {
        const claim = await tx.claim.findUnique({
            where: { id: claimId },
            include: { case: { select: { id: true, authorId: true, caseStatus: true, canUserCreateClaimUpdate: true } } }
        });
        if (!claim) {
            const error = new Error("Claim not found");
            error.statusCode = 404;
            throw error;
        }
        if (claim.claimStatus !== "SHOW" || claim.case.caseStatus !== "SHOW") {
            const error = new Error("Claim or Case is not active");
            error.statusCode = 400;
            throw error;
        }
        if (claim.case.canUserCreateClaimUpdate === false && claim.case.authorId !== userId) {
            const error = new Error("Creating claim updates is disabled for this case");
            error.statusCode = 403;
            throw error;
        }
        const isDirectCaseClaim = claim.createdBy === claim.case.authorId || claim.claimType === "DIRECT_CASE";
        const previousState = claim.currentState || "PROPOSED";
        const newState = data.newState || null;
        let finalUpdateType = data.updateType || "GENERAL_UPDATE";
        if (newState && newState !== previousState && finalUpdateType === "GENERAL_UPDATE") {
            finalUpdateType = "STATE_CHANGED";
        }
        if (newState && newState !== previousState) {
            await tx.claim.update({
                where: { id: claimId },
                data: { currentState: newState }
            });
        }
        // Handle new native evidence created during update flow
        const targetEvidenceIds = [...(data.evidenceIds || [])];
        if (data.evidence && data.evidence.length > 0) {
            for (let index = 0; index < data.evidence.length; index++) {
                const ev = data.evidence[index];
                const newEv = await tx.evidence.create({
                    data: {
                        title: ev.title,
                        type: ev.type,
                        submittedBy: userId,
                        isAnonymous: ev.isAnonymous || data.isAnonymous || false
                    }
                });
                await tx.claimEvidence.create({
                    data: {
                        claimId,
                        evidenceId: newEv.id,
                        relationship: ev.relationship || "SUPPORTS"
                    }
                });
                const evidenceMedias = await media_service_1.default.processAndCreateMedia(tx, files, `evidenceMedia_${index}`);
                for (const { mediaId, order } of evidenceMedias) {
                    await tx.evidenceMedia.create({
                        data: {
                            evidenceId: newEv.id,
                            mediaId,
                            order,
                        },
                    });
                }
                targetEvidenceIds.push(newEv.id);
            }
        }
        // Handle new native sources created during update flow
        const targetSourceIds = [...(data.sourceIds || [])];
        if (data.sources && data.sources.length > 0) {
            for (const src of data.sources) {
                const newSrc = await tx.source.create({
                    data: {
                        title: src.title,
                        sourceLocation: src.sourceLocation,
                        sourceDate: src.sourceDate ? new Date(src.sourceDate) : null,
                        externalSourceType: src.externalSourceType || "WEBSITE",
                        externalSourceName: src.externalSourceName || "External Source",
                        externalLinks: src.externalLinks || [],
                        createdBy: userId,
                        isAnonymous: src.isAnonymous || data.isAnonymous || false
                    }
                });
                await tx.claimSource.create({
                    data: {
                        claimId,
                        sourceId: newSrc.id,
                        relationship: src.relationship || "SUPPORTS"
                    }
                });
                targetSourceIds.push(newSrc.id);
            }
        }
        // Validate selected existing evidenceIds against ClaimEvidence
        const existingEvidenceIdsToValidate = data.evidenceIds || [];
        if (existingEvidenceIdsToValidate.length > 0) {
            const validClaimEvidence = await tx.claimEvidence.findMany({
                where: {
                    claimId,
                    evidenceId: { in: existingEvidenceIdsToValidate }
                },
                select: { evidenceId: true }
            });
            const validEvidenceSet = new Set(validClaimEvidence.map(e => e.evidenceId));
            const invalidEv = existingEvidenceIdsToValidate.find(id => !validEvidenceSet.has(id));
            if (invalidEv) {
                const error = new Error(`Evidence ${invalidEv} is not associated with this claim`);
                error.statusCode = 400;
                throw error;
            }
        }
        // Validate selected existing sourceIds against ClaimSource
        const existingSourceIdsToValidate = data.sourceIds || [];
        if (existingSourceIdsToValidate.length > 0) {
            const validClaimSources = await tx.claimSource.findMany({
                where: {
                    claimId,
                    sourceId: { in: existingSourceIdsToValidate }
                },
                select: { sourceId: true }
            });
            const validSourceSet = new Set(validClaimSources.map(s => s.sourceId));
            const invalidSrc = existingSourceIdsToValidate.find(id => !validSourceSet.has(id));
            if (invalidSrc) {
                const error = new Error(`Source ${invalidSrc} is not associated with this claim`);
                error.statusCode = 400;
                throw error;
            }
        }
        const createdUpdate = await tx.claimUpdate.create({
            data: {
                claimId,
                content: data.content,
                previousState: newState && newState !== previousState ? previousState : null,
                newState,
                updateType: finalUpdateType,
                createdBy: userId,
                isAnonymous: data.isAnonymous || false,
                isDeleted: false,
                isVerified: false,
                evidence: {
                    create: targetEvidenceIds.map(eId => ({ evidenceId: eId }))
                },
                sources: {
                    create: targetSourceIds.map(sId => ({ sourceId: sId }))
                }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        userName: true,
                        type: true,
                        userProfile: true,
                    }
                },
                evidence: {
                    include: {
                        evidence: {
                            include: {
                                medias: {
                                    include: { media: true }
                                }
                            }
                        }
                    }
                },
                sources: {
                    include: {
                        source: true
                    }
                }
            }
        });
        await tx.case.update({
            where: { id: claim.caseId },
            data: { lastActivityAt: new Date() }
        });
        return sanitizeAnonymousClaimUpdate(createdUpdate);
    });
};
const getClaimUpdates = async (claimId, limit = 20, cursor) => {
    const { sanitizeAnonymousClaimUpdate } = require('../../utils/privacy.utils');
    const claim = await prisma_1.db.claim.findUnique({
        where: { id: claimId },
        select: { id: true, currentState: true, updatedAt: true }
    });
    if (!claim) {
        const error = new Error("Claim not found");
        error.statusCode = 404;
        throw error;
    }
    const updates = await prisma_1.db.claimUpdate.findMany({
        where: { claimId, isDeleted: false },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        include: {
            author: {
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    type: true,
                    userProfile: true,
                }
            },
            evidence: {
                include: {
                    evidence: {
                        include: {
                            medias: {
                                include: { media: true }
                            }
                        }
                    }
                }
            },
            sources: {
                include: {
                    source: true
                }
            }
        }
    });
    let nextCursor = null;
    if (updates.length > limit) {
        const nextItem = updates.pop();
        nextCursor = nextItem?.id || null;
    }
    const totalCount = await prisma_1.db.claimUpdate.count({ where: { claimId, isDeleted: false } });
    const sanitizedUpdates = updates.map(sanitizeAnonymousClaimUpdate);
    const latestUpdate = sanitizedUpdates[0] || null;
    return {
        updates: sanitizedUpdates,
        nextCursor,
        totalCount,
        currentState: claim.currentState || "PROPOSED",
        lastUpdated: latestUpdate ? latestUpdate.createdAt : claim.updatedAt,
        latestAuthor: latestUpdate ? latestUpdate.author : null,
    };
};
/* =========================================================
   CASE SETTINGS SERVICE
========================================================= */
const updateCaseSettings = async (caseId, settingsData, userId) => {
    const existingCase = await prisma_1.db.case.findUnique({
        where: { id: caseId }
    });
    if (!existingCase) {
        const error = new Error("Case not found");
        error.statusCode = 404;
        throw error;
    }
    if (existingCase.authorId !== userId) {
        const error = new Error("Unauthorized to update settings for this case");
        error.statusCode = 403;
        throw error;
    }
    const updatedCase = await prisma_1.db.case.update({
        where: { id: caseId },
        data: {
            ...(typeof settingsData.canUserCreateClaim === "boolean" && { canUserCreateClaim: settingsData.canUserCreateClaim }),
            ...(typeof settingsData.canUserCreateClaimEvidence === "boolean" && { canUserCreateClaimEvidence: settingsData.canUserCreateClaimEvidence }),
            ...(typeof settingsData.canUserCreateClaimUpdate === "boolean" && { canUserCreateClaimUpdate: settingsData.canUserCreateClaimUpdate }),
        }
    });
    return {
        id: updatedCase.id,
        settings: {
            canUserCreateClaim: updatedCase.canUserCreateClaim,
            canUserCreateClaimEvidence: updatedCase.canUserCreateClaimEvidence,
            canUserCreateClaimUpdate: updatedCase.canUserCreateClaimUpdate
        }
    };
};
/* =========================================================
   SERVICE OBJECT
========================================================= */
const caseService = {
    createNewCase,
    getNewsFeed,
    getCaseDetails,
    createClaim,
    addEvidenceToClaim,
    addEvidenceToCase,
    submitAssessment,
    getAssessments,
    submitCaseReaction,
    recordCaseView,
    getClaimUpdatePermissions,
    createClaimUpdate,
    getClaimUpdates,
    updateCaseSettings,
};
exports.default = caseService;
