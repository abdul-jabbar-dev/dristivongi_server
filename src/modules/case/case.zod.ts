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
    title: z.string().min(3),
    titleHtml: z.string(),
    location: z.string().min(3),
    isAnonymous: z.boolean().optional(),

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
});


/* =========================
   CREATE CLAIM
========================= */

const createClaimSchema = z.object({
    title: z.string().min(3),
    isAnonymous: z.boolean().optional(),

    evidence: z
        .array(evidenceSchema)
        .default([]),

    sources: z
        .array(sourceSchema)
        .default([]),
});


const addEvidenceSchema = z.object({
    isAnonymous: z.boolean().optional(),
    evidence: z.array(evidenceSchema).default([]),
    sources: z.array(sourceSchema).default([]),
});

const submitAssessmentSchema = z.object({
    assessment: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONTRADICTED", "DISPUTED"]),
    isAnonymous: z.boolean().default(false),
});

const submitCaseReactionSchema = z.object({
    value: z.enum(["SUPPORT", "OPPOSE", "NONE"]),
});

export type TCreateCase = z.infer<typeof createCaseSchema>;
export type TCreateClaim = z.infer<typeof createClaimSchema>;
export type TAddEvidence = z.infer<typeof addEvidenceSchema>;
export type TSubmitAssessment = z.infer<typeof submitAssessmentSchema>;
export type TSubmitCaseReaction = z.infer<typeof submitCaseReactionSchema>;

const caseZod = {
    createCaseSchema,
    createClaimSchema,
    addEvidenceSchema,
    submitAssessmentSchema,
    submitCaseReactionSchema,
};

export default caseZod;