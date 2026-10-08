import { z } from "zod";

const relationshipSchema = z.enum([
    "SUPPORTS",
    "CHALLENGES",
    "CONTEXT",
]);

const evidenceSchema = z.object({
    title: z.string().min(1),
    type: z.string().min(1),
    relationship: relationshipSchema,
    isAnonymous: z.boolean().optional(),
});

const sourceSchema = z.object({
    title: z.string().min(1),
    sourceLocation: z.string(),
    sourceDate: z.string().nullable(),
    externalSourceType: z.string(),
    externalSourceName: z.string(),
    externalLinks: z.array(z.string()),
    relationship: relationshipSchema,
    isAnonymous: z.boolean().optional(),
});


/* =========================
   CREATE CASE
========================= */

const createCaseSchema = z.object({
    body: z.object({
        title: z.string().min(3),
        titleHtml: z.string(),
        location: z.string().min(3),
        isAnonymous: z.boolean().optional(),
        organizationId: z.string().optional(),
        canUserCreateClaim: z.boolean().optional(),
        canUserCreateClaimEvidence: z.boolean().optional(),
        canUserCreateClaimUpdate: z.boolean().optional(),

        claims: z.object({
            title: z.string().min(3),
            isAnonymous: z.boolean().optional(),

            evidence: z
                .array(evidenceSchema)
                .default([]),

            sources: z
                .array(sourceSchema)
                .default([]),
        }).optional(),

        tags: z.array(z.string()).optional(),
    })
});


/* =========================
   CREATE CLAIM
========================= */

const createClaimSchema = z.object({
    body: z.object({
        title: z.string().min(3),
        isAnonymous: z.boolean().optional(),

        evidence: z
            .array(evidenceSchema)
            .default([]),

        sources: z
            .array(sourceSchema)
            .default([]),
    })
});


const addEvidenceSchema = z.object({
    body: z.object({
        isAnonymous: z.boolean().optional(),
        evidence: z.array(evidenceSchema).default([]),
        sources: z.array(sourceSchema).default([]),
    })
});

const submitAssessmentSchema = z.object({
    body: z.object({
        assessment: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONTRADICTED", "DISPUTED"]),
        isAnonymous: z.boolean().default(false),
    })
});

const submitCaseReactionSchema = z.object({
    body: z.object({
        value: z.enum(["SUPPORT", "OPPOSE", "NONE"]),
    })
});

const createClaimUpdateSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Update content is required"),
        updateType: z.enum([
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
        newState: z.enum([
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
        evidenceIds: z.array(z.string()).optional().default([]),
        sourceIds: z.array(z.string()).optional().default([]),
        evidence: z.array(evidenceSchema).optional().default([]),
        sources: z.array(sourceSchema).optional().default([]),
        isAnonymous: z.boolean().optional().default(false),
    })
});

const createCaseUpdateSchema = z.object({
    body: z.object({
        content: z.string().min(1, "Update content is required"),
        updateType: z.enum([
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
        newStatus: z.string().optional().nullable(),
        evidenceIds: z.array(z.string()).optional().default([]),
        sourceIds: z.array(z.string()).optional().default([]),
        evidence: z.array(evidenceSchema).optional().default([]),
        sources: z.array(sourceSchema).optional().default([]),
        isAnonymous: z.boolean().optional().default(false),
    })
});

const updateCaseSettingsSchema = z.object({
    body: z.object({
        canUserCreateClaim: z.boolean().optional(),
        canUserCreateClaimEvidence: z.boolean().optional(),
        canUserCreateClaimUpdate: z.boolean().optional(),
    })
});

export type TCreateCase = z.infer<typeof createCaseSchema>["body"];
export type TCreateClaim = z.infer<typeof createClaimSchema>["body"];
export type TAddEvidence = z.infer<typeof addEvidenceSchema>["body"];
export type TSubmitAssessment = z.infer<typeof submitAssessmentSchema>["body"];
export type TSubmitCaseReaction = z.infer<typeof submitCaseReactionSchema>["body"];
export type TCreateClaimUpdate = z.infer<typeof createClaimUpdateSchema>["body"];
export type TCreateCaseUpdate = z.infer<typeof createCaseUpdateSchema>["body"];
export type TUpdateCaseSettings = z.infer<typeof updateCaseSettingsSchema>["body"];

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

export default caseZod;