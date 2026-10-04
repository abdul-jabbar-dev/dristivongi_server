import { db } from "../../../lib/prisma";
import { EvidenceValidationValue } from "@prisma/client";

const submitValidation = async (evidenceId: string, userId: string, value: EvidenceValidationValue) => {
    // Check if evidence exists
    const evidence = await db.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
        throw new Error("Evidence not found"); // Handled by global error handler
    }

    const validation = await db.evidenceValidation.upsert({
        where: {
            evidenceId_userId: {
                evidenceId,
                userId
            }
        },
        update: {
            value
        },
        create: {
            evidenceId,
            userId,
            value
        }
    });

    return getValidationSummary(evidenceId, userId);
};

const getValidationSummary = async (evidenceId: string, userId: string | null) => {
    const validations = await db.evidenceValidation.findMany({
        where: { evidenceId }
    });

    let valid = 0;
    let invalid = 0;
    let currentUserVote: EvidenceValidationValue | null = null;

    for (const v of validations) {
        if (v.value === "VALID") valid++;
        if (v.value === "INVALID") invalid++;
        if (userId && v.userId === userId) {
            currentUserVote = v.value;
        }
    }

    const total = valid + invalid;
    const validPercentage = total === 0 ? 0 : Math.round((valid / total) * 100);
    const invalidPercentage = total === 0 ? 0 : Math.round((invalid / total) * 100);

    return {
        valid,
        invalid,
        total,
        validPercentage,
        invalidPercentage,
        currentUserVote
    };
};

export default {
    submitValidation,
    getValidationSummary
};
