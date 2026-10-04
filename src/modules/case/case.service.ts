import { db } from "../../../lib/prisma";
import {
    TCreateCase,
    TCreateClaim,
    TSubmitCaseReaction,
} from "./case.zod";

import mediaService from "../media/media.service";
import { extractHashtags, normalizeHashtag, removeHashtags } from "../../lib/hashtag.utils";
/* =========================================================
   CREATE CASE
   Case
   └── First Claim
       ├── Evidence
       └── Sources
========================================================= */

const createNewCase = async (
    caseData: TCreateCase,
    author: string,
    files: any[] = []
) => {

    return db.$transaction(async (tx) => {

        /* =====================================================
           1.5 HASHTAGS (Extract before we strip them from text)
        ===================================================== */
        // Use plain text for extraction to avoid HTML color codes like #ffffff
        const contentTags = extractHashtags(caseData.title || (caseData.titleHtml ? caseData.titleHtml.replace(/<[^>]+>/g, '') : ''));
        const explicitTags = (caseData.tags || []).map(t => normalizeHashtag(t));
        const allTags = [...new Set([...contentTags, ...explicitTags])].filter(Boolean);

        /* =====================================================
           1. CREATE CASE
        ===================================================== */

        const cleanTitleHtml = removeHashtags(caseData.titleHtml, allTags);
        const cleanTitle = removeHashtags(caseData.title, allTags);

        const newCase = await tx.case.create({
            data: {
                title: cleanTitle,
                titleHtml: cleanTitleHtml,
                location: caseData.location,
                authorId: author,
                caseStatus: "SHOW",
            },
        });

        /* =====================================================
           1.5 HASHTAGS
        ===================================================== */

        for (const normalizedName of allTags) {
            // We use the originally typed name for display if available, else normalized
            const originalName = caseData.tags?.find(t => normalizeHashtag(t) === normalizedName) ||
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

        const caseMedias =
            await mediaService.processAndCreateMedia(
                tx,
                files,
                "caseMedia"
            );

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
            },
        });


        /* =====================================================
           4. CLAIM MEDIA
        ===================================================== */

        const claimMedias =
            await mediaService.processAndCreateMedia(
                tx,
                files,
                "claimMedia"
            );

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

        const evidences =
            caseData.claims.evidence ?? [];

        for (
            let index = 0;
            index < evidences.length;
            index++
        ) {

            const evidence = evidences[index];


            const newEvidence =
                await tx.evidence.create({
                    data: {
                        title: evidence.title,
                        type: evidence.type,
                        submittedBy: author,
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

            const evidenceMedias =
                await mediaService.processAndCreateMedia(
                    tx,
                    files,
                    `evidenceMedia_${index}`
                );


            for (const {
                mediaId,
                order
            } of evidenceMedias) {

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

        const sources =
            caseData.claims.sources ?? [];


        for (const source of sources) {

            const newSource =
                await tx.source.create({
                    data: {

                        title: source.title,

                        sourceLocation:
                            source.sourceLocation,

                        sourceDate:
                            source.sourceDate
                                ? new Date(source.sourceDate)
                                : null,

                        externalSourceType:
                            source.externalSourceType,

                        externalSourceName:
                            source.externalSourceName,

                        externalLinks:
                            source.externalLinks,

                        createdBy: author,
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


import { caseRankingService } from "./caseRanking.service";
import { RANKING_CONFIG } from "./ranking.config";

/* =========================================================
   RECORD CASE VIEW
========================================================= */

const recordCaseView = async (caseId: string, userId?: string, visitorKey?: string) => {
    const timeWindow = new Date(Date.now() - RANKING_CONFIG.VIEW_DEDUP_WINDOW_MINUTES * 60 * 1000);

    let existingView = null;
    if (userId) {
        existingView = await db.caseView.findFirst({
            where: { caseId, userId, createdAt: { gte: timeWindow } }
        });
    } else if (visitorKey) {
        existingView = await db.caseView.findFirst({
            where: { caseId, visitorKey, createdAt: { gte: timeWindow } }
        });
    }

    if (existingView) return { recorded: false, reason: "deduplicated" };

    await db.caseView.create({
        data: { caseId, userId, visitorKey }
    });

    return { recorded: true };
};

/* =========================================================
   GET NEWS FEED
========================================================= */

import { feedService } from "../feed/feed.service"; 

const getNewsFeed = async (tag?: string, author?: string, currentUserId?: string, sort: string = 'recent', page: number = 1, limit: number = 10) => {
    return feedService.getNewsFeed({
        userId: currentUserId,
        sort,
        page,
        limit,
        tag,
        author,
        config: RANKING_CONFIG
    });
};

const _oldGetNewsFeed = async (tag?: string, author?: string, currentUserId?: string) => {

    const whereClause: any = {
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

    const result = await db.case.findMany({

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
        let currentUserReaction: string | null = null;

        if (caseItem.caseReactions) {
            caseItem.caseReactions.forEach((reaction: any) => {
                if (reaction.value === "SUPPORT") support++;
                if (reaction.value === "OPPOSE") oppose++;
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

const getCaseDetails = async (
    id: string,
    currentUserId?: string
) => {

    const result =
        await db.case.findUnique({

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

                                    },

                                },

                            },

                        },


                        /* =========================
                           SOURCES
                        ========================= */

                        sources: {

                            include: {
                                source: true,
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
    let currentUserReaction: string | null = null;

    if (result.caseReactions) {
        result.caseReactions.forEach((reaction: any) => {
            if (reaction.value === "SUPPORT") support++;
            if (reaction.value === "OPPOSE") oppose++;
            if (currentUserId && reaction.userId === currentUserId) {
                currentUserReaction = reaction.value;
            }
        });
    }

    return {
        ...result,
        reaction: {
            support,
            oppose,
            total: support + oppose,
            currentUserReaction
        },
        caseReactions: undefined
    };
};


/* =========================================================
   CREATE CLAIM
========================================================= */

const createClaim = async (
    caseId: string,
    claimData: TCreateClaim,
    author: string,
    files: any[] = []
) => {

    return db.$transaction(async (tx) => {


        /* =====================================================
           1. CHECK CASE
        ===================================================== */

        const existingCase =
            await tx.case.findUnique({

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

        const newClaim =
            await tx.claim.create({

                data: {

                    title:
                        claimData.title,

                    claimStatus:
                        "SHOW",

                    caseId,

                    createdBy:
                        author,

                    claimType:
                        "BASIC",

                },

            });


        /* =====================================================
           3. CLAIM MEDIA
        ===================================================== */

        const claimMedias =
            await mediaService.processAndCreateMedia(
                tx,
                files,
                "claimMedia"
            );


        for (const {
            mediaId,
            order
        } of claimMedias) {

            await tx.claimMedia.create({

                data: {

                    claimId:
                        newClaim.id,

                    mediaId,

                    order,

                },

            });

        }


        /* =====================================================
           4. CREATE EVIDENCE
        ===================================================== */

        const evidences =
            claimData.evidence ?? [];


        for (
            let index = 0;
            index < evidences.length;
            index++
        ) {

            const evidence =
                evidences[index];


            const newEvidence =
                await tx.evidence.create({

                    data: {

                        title:
                            evidence.title,

                        type:
                            evidence.type,

                        submittedBy:
                            author,

                    },

                });


            /* Claim ↔ Evidence */

            await tx.claimEvidence.create({

                data: {

                    claimId:
                        newClaim.id,

                    evidenceId:
                        newEvidence.id,

                    relationship:
                        evidence.relationship,

                },

            });


            /* Evidence Media */

            const evidenceMedias =
                await mediaService.processAndCreateMedia(
                    tx,
                    files,
                    `evidenceMedia_${index}`
                );


            for (const {
                mediaId,
                order
            } of evidenceMedias) {

                await tx.evidenceMedia.create({

                    data: {

                        evidenceId:
                            newEvidence.id,

                        mediaId,

                        order,

                    },

                });

            }

        }


        /* =====================================================
           5. CREATE SOURCES
        ===================================================== */

        const sources =
            claimData.sources ?? [];


        for (const source of sources) {

            const newSource =
                await tx.source.create({

                    data: {

                        title:
                            source.title,

                        sourceLocation:
                            source.sourceLocation,

                        sourceDate:
                            source.sourceDate
                                ? new Date(
                                    source.sourceDate
                                )
                                : null,

                        externalSourceType:
                            source.externalSourceType,

                        externalSourceName:
                            source.externalSourceName,

                        externalLinks:
                            source.externalLinks,

                        createdBy:
                            author,

                    },

                });


            /* Claim ↔ Source */

            await tx.claimSource.create({

                data: {

                    claimId:
                        newClaim.id,

                    sourceId:
                        newSource.id,

                    relationship:
                        source.relationship,

                },

            });

        }


        /* =====================================================
           RETURN
        ===================================================== */

        return newClaim;

    });
};


const addEvidenceToClaim = async (
    claimId: string,
    payload: { evidence?: any[], sources?: any[] },
    author: string,
    files: any[] = []
) => {
    return db.$transaction(async (tx) => {
        // 1. CHECK CLAIM
        const existingClaim = await tx.claim.findUnique({
            where: { id: claimId },
        });

        if (!existingClaim) {
            throw new Error("Claim not found");
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
                },
            });

            await tx.claimEvidence.create({
                data: {
                    claimId: existingClaim.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });

            const evidenceMedias = await mediaService.processAndCreateMedia(
                tx,
                files,
                `evidenceMedia_${index}`
            );

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

const addEvidenceToCase = async (
    caseId: string,
    payload: { evidence?: any[], sources?: any[] },
    author: string,
    files: any[] = []
) => {
    return db.$transaction(async (tx) => {
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
                },
            });

            await tx.caseEvidence.create({
                data: {
                    caseId: existingCase.id,
                    evidenceId: newEvidence.id,
                    relationship: evidence.relationship,
                },
            });

            const evidenceMedias = await mediaService.processAndCreateMedia(
                tx,
                files,
                `evidenceMedia_${index}`
            );

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

const submitAssessment = async (
    claimId: string,
    authorId: string,
    payload: any
) => {
    return db.$transaction(async (tx) => {
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

const getAssessments = async (claimId: string, authorId?: string) => {
    const assessments = await db.assessment.findMany({
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
        if (a.assessment === 'SUPPORTED') support++;
        if (a.assessment === 'INSUFFICIENT_EVIDENCE' || a.assessment === 'PARTIALLY_SUPPORTED') neutral++;
        if (a.assessment === 'CONTRADICTED' || a.assessment === 'DISPUTED') opposition++;

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

const submitCaseReaction = async (
    caseId: string,
    userId: string,
    reactionData: TSubmitCaseReaction
) => {
    // Check if case exists
    const caseRecord = await db.case.findUnique({
        where: { id: caseId }
    });

    if (!caseRecord) {
        throw new Error("Case not found");
    }

    if (reactionData.value === "NONE") {
        await db.caseReaction.deleteMany({
            where: {
                caseId,
                userId
            }
        });
    } else {
        await db.caseReaction.upsert({
            where: {
                caseId_userId: {
                    caseId,
                    userId
                }
            },
            update: {
                value: reactionData.value as "SUPPORT" | "OPPOSE"
            },
            create: {
                caseId,
                userId,
                value: reactionData.value as "SUPPORT" | "OPPOSE"
            }
        });
    }

    // Recalculate counts
    const counts = await db.caseReaction.groupBy({
        by: ['value'],
        where: { caseId },
        _count: { value: true }
    });

    let support = 0;
    let oppose = 0;

    counts.forEach(count => {
        if (count.value === "SUPPORT") support = count._count.value;
        if (count.value === "OPPOSE") oppose = count._count.value;
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
};

export default caseService;
