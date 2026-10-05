import { z } from "zod";

export const OpinionValues = {
  CASE: ['NEEDS_MORE_INFORMATION', 'IMPORTANT', 'DISPUTED', 'DISCUSSION'],
  CLAIM: ['SUPPORTED', 'PARTIALLY_SUPPORTED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'DISPUTED', 'DISCUSSION'],
  EVIDENCE: ['RELEVANT', 'NOT_RELEVANT', 'SUPPORTS', 'CHALLENGES'],
  SOURCE: ['RELIABLE', 'QUESTIONABLE', 'IRRELEVANT', 'NEEDS_VERIFICATION']
} as const;

export const createOpinionSchema = z.object({
    body: z.object({
        targetType: z.enum(["CASE", "CLAIM", "EVIDENCE", "SOURCE"]),
        targetId: z.string().min(1, "Target ID is required"),
        content: z.string().optional().default(""),
        value: z.string().optional(),
        isAnonymous: z.boolean().optional(),
        parentId: z.string().optional(),
        sources: z.array(z.object({
            title: z.string(),
            description: z.string().optional(),
            sourceLocation: z.string().optional(),
            externalSourceType: z.string(),
            externalSourceName: z.string(),
            externalLinks: z.array(z.string()).optional()
        })).optional()
    }).refine((data) => {
        if (data.value) {
            const targetType = data.targetType as keyof typeof OpinionValues;
            const allowedValues = OpinionValues[targetType] as readonly string[];
            if (!allowedValues.includes(data.value)) {
                return false;
            }
        }
        return true;
    }, {
        message: "Invalid opinion value for the selected target type",
        path: ["value"]
    })
});

export type TCreateOpinion = z.infer<typeof createOpinionSchema>['body'];
