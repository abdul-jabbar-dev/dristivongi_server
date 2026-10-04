"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../lib/prisma");
const submitValidation = async (evidenceId, userId, value) => {
    // Check if evidence exists
    const evidence = await prisma_1.db.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) {
        throw new Error("Evidence not found"); // Handled by global error handler
    }
    if (value === "NONE") {
        try {
            await prisma_1.db.evidenceValidation.delete({
                where: {
                    evidenceId_userId: {
                        evidenceId,
                        userId
                    }
                }
            });
        }
        catch (e) {
            // Ignore if record doesn't exist
        }
    }
    else {
        const validation = await prisma_1.db.evidenceValidation.upsert({
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
    }
    return getValidationSummary(evidenceId, userId);
};
const getValidationSummary = async (evidenceId, userId) => {
    const validations = await prisma_1.db.evidenceValidation.findMany({
        where: { evidenceId }
    });
    let valid = 0;
    let invalid = 0;
    let currentUserVote = null;
    for (const v of validations) {
        if (v.value === "VALID")
            valid++;
        if (v.value === "INVALID")
            invalid++;
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
exports.default = {
    submitValidation,
    getValidationSummary
};
