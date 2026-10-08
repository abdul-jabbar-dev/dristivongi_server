"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpinionSchema = exports.OpinionValues = void 0;
const zod_1 = require("zod");
exports.OpinionValues = {
    CASE: ['NEEDS_MORE_INFORMATION', 'IMPORTANT', 'DISPUTED', 'DISCUSSION'],
    CLAIM: ['SUPPORTED', 'PARTIALLY_SUPPORTED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'DISPUTED', 'DISCUSSION'],
    EVIDENCE: ['RELEVANT', 'NOT_RELEVANT', 'SUPPORTS', 'CHALLENGES'],
    SOURCE: ['RELIABLE', 'QUESTIONABLE', 'IRRELEVANT', 'NEEDS_VERIFICATION']
};
exports.createOpinionSchema = zod_1.z.object({
    body: zod_1.z.object({
        targetType: zod_1.z.enum(["CASE", "CLAIM", "EVIDENCE", "SOURCE"]),
        targetId: zod_1.z.string().min(1, "Target ID is required"),
        content: zod_1.z.string().optional().default(""),
        value: zod_1.z.string().optional(),
        isAnonymous: zod_1.z.boolean().optional(),
        parentId: zod_1.z.string().optional(),
        sources: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string(),
            description: zod_1.z.string().optional(),
            sourceLocation: zod_1.z.string().optional(),
            externalSourceType: zod_1.z.string(),
            externalSourceName: zod_1.z.string(),
            externalLinks: zod_1.z.array(zod_1.z.string()).optional()
        })).optional()
    }).refine((data) => {
        if (data.value) {
            const targetType = data.targetType;
            const allowedValues = exports.OpinionValues[targetType];
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
