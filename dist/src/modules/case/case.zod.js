"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const relationshipSchema = zod_1.z.enum([
    "SUPPORTS",
    "CHALLENGES",
    "CONTEXT",
]);
const evidenceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    relationship: relationshipSchema,
    isAnonymous: zod_1.z.boolean().optional(),
});
const sourceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    sourceLocation: zod_1.z.string(),
    sourceDate: zod_1.z.string().nullable(),
    externalSourceType: zod_1.z.string(),
    externalSourceName: zod_1.z.string(),
    externalLinks: zod_1.z.array(zod_1.z.string()),
    relationship: relationshipSchema,
    isAnonymous: zod_1.z.boolean().optional(),
});
/* =========================
   CREATE CASE
========================= */
const createCaseSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3),
        titleHtml: zod_1.z.string(),
        location: zod_1.z.string().min(3),
        isAnonymous: zod_1.z.boolean().optional(),
        organizationId: zod_1.z.string().optional(),
        canUserCreateClaim: zod_1.z.boolean().optional(),
        canUserCreateClaimEvidence: zod_1.z.boolean().optional(),
        canUserCreateClaimUpdate: zod_1.z.boolean().optional(),
        claims: zod_1.z.object({
            title: zod_1.z.string().min(3),
            isAnonymous: zod_1.z.boolean().optional(),
            evidence: zod_1.z
                .array(evidenceSchema)
                .default([]),
            sources: zod_1.z
                .array(sourceSchema)
                .default([]),
        }).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    })
});
/* =========================
   CREATE CLAIM
========================= */
const createClaimSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3),
        isAnonymous: zod_1.z.boolean().optional(),
        evidence: zod_1.z
            .array(evidenceSchema)
            .default([]),
        sources: zod_1.z
            .array(sourceSchema)
            .default([]),
    })
});
const addEvidenceSchema = zod_1.z.object({
    body: zod_1.z.object({
        isAnonymous: zod_1.z.boolean().optional(),
        evidence: zod_1.z.array(evidenceSchema).default([]),
        sources: zod_1.z.array(sourceSchema).default([]),
    })
});
const submitAssessmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        assessment: zod_1.z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONTRADICTED", "DISPUTED"]),
        isAnonymous: zod_1.z.boolean().default(false),
    })
});
const submitCaseReactionSchema = zod_1.z.object({
    body: zod_1.z.object({
        value: zod_1.z.enum(["SUPPORT", "OPPOSE", "NONE"]),
    })
});
const createClaimUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, "Update content is required"),
        updateType: zod_1.z.enum([
            "GENERAL_UPDATE",
            "INFORMATION_ADDED",
            "EVIDENCE_ADDED",
            "SOURCE_ADDED",
            "STATE_CHANGED",
            "CLAIM_REVISED",
            "CLAIM_CLARIFIED",
            "CHALLENGED",
            "WITHDRAWN",
            "SUPERSEDED"
        ]).default("GENERAL_UPDATE"),
        newState: zod_1.z.enum([
            "PROPOSED",
            "SUPPORTED",
            "PARTIALLY_SUPPORTED",
            "INSUFFICIENT_EVIDENCE",
            "CHALLENGED",
            "CONTRADICTED",
            "DISPUTED",
            "WITHDRAWN",
            "SUPERSEDED"
        ]).optional().nullable(),
        evidenceIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
        sourceIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
        evidence: zod_1.z.array(evidenceSchema).optional().default([]),
        sources: zod_1.z.array(sourceSchema).optional().default([]),
        isAnonymous: zod_1.z.boolean().optional().default(false),
    })
});
const createCaseUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, "Update content is required"),
        updateType: zod_1.z.enum([
            "GENERAL_UPDATE",
            "INFORMATION_ADDED",
            "EVIDENCE_ADDED",
            "SOURCE_ADDED",
            "STATE_CHANGED",
            "CLAIM_REVISED",
            "CLAIM_CLARIFIED",
            "CHALLENGED",
            "WITHDRAWN",
            "SUPERSEDED"
        ]).default("GENERAL_UPDATE"),
        newStatus: zod_1.z.string().optional().nullable(),
        evidenceIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
        sourceIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
        evidence: zod_1.z.array(evidenceSchema).optional().default([]),
        sources: zod_1.z.array(sourceSchema).optional().default([]),
        isAnonymous: zod_1.z.boolean().optional().default(false),
    })
});
const updateCaseSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        canUserCreateClaim: zod_1.z.boolean().optional(),
        canUserCreateClaimEvidence: zod_1.z.boolean().optional(),
        canUserCreateClaimUpdate: zod_1.z.boolean().optional(),
    })
});
const caseZod = {
    createCaseSchema,
    createClaimSchema,
    addEvidenceSchema,
    submitAssessmentSchema,
    submitCaseReactionSchema,
    createClaimUpdateSchema,
    createCaseUpdateSchema,
    updateCaseSettingsSchema,
};
exports.default = caseZod;
