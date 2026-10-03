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
});
const sourceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    sourceLocation: zod_1.z.string(),
    sourceDate: zod_1.z.string().nullable(),
    externalSourceType: zod_1.z.string(),
    externalSourceName: zod_1.z.string(),
    externalLinks: zod_1.z.array(zod_1.z.string()),
    relationship: relationshipSchema,
});
/* =========================
   CREATE CASE
========================= */
const createCaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    titleHtml: zod_1.z.string(),
    location: zod_1.z.string().min(3),
    claims: zod_1.z.object({
        title: zod_1.z.string().min(3),
        evidence: zod_1.z
            .array(evidenceSchema)
            .default([]),
        sources: zod_1.z
            .array(sourceSchema)
            .default([]),
    }).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
/* =========================
   CREATE CLAIM
========================= */
const createClaimSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    evidence: zod_1.z
        .array(evidenceSchema)
        .default([]),
    sources: zod_1.z
        .array(sourceSchema)
        .default([]),
});
const addEvidenceSchema = zod_1.z.object({
    evidence: zod_1.z.array(evidenceSchema).default([]),
    sources: zod_1.z.array(sourceSchema).default([]),
});
const submitAssessmentSchema = zod_1.z.object({
    assessment: zod_1.z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONTRADICTED", "DISPUTED"]),
    isAnonymous: zod_1.z.boolean().default(false),
});
const caseZod = {
    createCaseSchema,
    createClaimSchema,
    addEvidenceSchema,
    submitAssessmentSchema,
};
exports.default = caseZod;
