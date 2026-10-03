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
});

const sourceSchema = z.object({
    title: z.string().min(1),
    sourceLocation: z.string(),
    sourceDate: z.string().nullable(),
    externalSourceType: z.string(),
    externalSourceName: z.string(),
    externalLinks: z.array(z.string()),
    relationship: relationshipSchema,
});


/* =========================
   CREATE CASE
========================= */

const createCaseSchema = z.object({
    title: z.string().min(3),
    titleHtml: z.string(),
    location: z.string().min(3),

    claims: z.object({
        title: z.string().min(3),

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

    evidence: z
        .array(evidenceSchema)
        .default([]),

    sources: z
        .array(sourceSchema)
        .default([]),
});


const addEvidenceSchema = z.object({
    evidence: z.array(evidenceSchema).default([]),
    sources: z.array(sourceSchema).default([]),
});

const submitAssessmentSchema = z.object({
    assessment: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONTRADICTED", "DISPUTED"]),
    isAnonymous: z.boolean().default(false),
});

export type TCreateCase = z.infer<typeof createCaseSchema>;
export type TCreateClaim = z.infer<typeof createClaimSchema>;
export type TAddEvidence = z.infer<typeof addEvidenceSchema>;
export type TSubmitAssessment = z.infer<typeof submitAssessmentSchema>;

const caseZod = {
    createCaseSchema,
    createClaimSchema,
    addEvidenceSchema,
    submitAssessmentSchema,
};

export default caseZod;