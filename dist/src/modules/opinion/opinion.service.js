"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../lib/prisma");
const media_service_1 = __importDefault(require("../media/media.service"));
const createOpinion = async (payload, authorId, files) => {
    const { targetType, targetId, content, value, parentId, sources, isAnonymous } = payload;
    if (!content?.trim() && (!files || files.length === 0) && (!sources || sources.length === 0)) {
        throw new Error("Comment must contain either text, files, or links");
    }
    // 1. Verify Target Exists
    let targetExists = false;
    if (targetType === "CASE") {
        targetExists = !!(await prisma_1.db.case.findUnique({ where: { id: targetId } }));
    }
    else if (targetType === "CLAIM") {
        targetExists = !!(await prisma_1.db.claim.findUnique({ where: { id: targetId } }));
    }
    else if (targetType === "EVIDENCE") {
        targetExists = !!(await prisma_1.db.evidence.findUnique({ where: { id: targetId } }));
    }
    else if (targetType === "SOURCE") {
        targetExists = !!(await prisma_1.db.source.findUnique({ where: { id: targetId } }));
    }
    if (!targetExists) {
        throw new Error("Target entity not found!");
    }
    if (parentId) {
        const parent = await prisma_1.db.opinion.findUnique({ where: { id: parentId } });
        if (!parent || parent.targetType !== targetType || parent.targetId !== targetId) {
            throw new Error("Invalid parent opinion thread!");
        }
    }
    // Process sources creation
    const sourceIds = [];
    if (sources && sources.length > 0) {
        for (const src of sources) {
            const newSource = await prisma_1.db.source.create({
                data: {
                    title: src.title,
                    sourceLocation: src.sourceLocation || "",
                    externalSourceType: src.externalSourceType,
                    externalSourceName: src.externalSourceName,
                    externalLinks: src.externalLinks || [],
                    createdBy: authorId,
                    isAnonymous: isAnonymous || false
                }
            });
            sourceIds.push(newSource.id);
        }
    }
    // Create the opinion with medias and sources in a transaction
    const opinion = await prisma_1.db.$transaction(async (tx) => {
        const newOp = await tx.opinion.create({
            data: {
                content,
                value,
                targetType,
                targetId,
                authorId,
                parentId,
                isAnonymous: isAnonymous || false
            }
        });
        // Process media files
        const uploadedMedias = files?.length
            ? await media_service_1.default.processAndCreateMedia(tx, files, "files")
            : [];
        if (uploadedMedias.length > 0) {
            await tx.opinionMedia.createMany({
                data: uploadedMedias.map((m) => ({
                    opinionId: newOp.id,
                    mediaId: m.mediaId,
                    order: m.order + 1
                }))
            });
        }
        if (sourceIds.length > 0) {
            await tx.opinionSource.createMany({
                data: sourceIds.map(srcId => ({
                    opinionId: newOp.id,
                    sourceId: srcId
                }))
            });
        }
        return newOp;
    });
    return await prisma_1.db.opinion.findUnique({
        where: { id: opinion.id },
        include: {
            author: { select: { id: true, fullName: true, userName: true, userProfile: { select: { profilePicture: true } } } },
            medias: { include: { media: true } },
            sources: { include: { source: true } }
        }
    });
};
const getOpinions = async (targetType, targetId) => {
    return await prisma_1.db.opinion.findMany({
        where: { targetType, targetId, parentId: null },
        include: {
            author: { select: { id: true, fullName: true, userName: true, userProfile: { select: { profilePicture: true } } } },
            medias: { include: { media: true } },
            sources: { include: { source: true } },
            replies: {
                include: {
                    author: { select: { id: true, fullName: true, userName: true, userProfile: { select: { profilePicture: true } } } }
                },
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
const deleteOpinion = async (id, authorId) => {
    const opinion = await prisma_1.db.opinion.findUnique({
        where: { id },
        include: { medias: { include: { media: true } } }
    });
    if (!opinion)
        throw new Error("Opinion not found!");
    if (opinion.authorId !== authorId)
        throw new Error("Unauthorized to delete this opinion!");
    const mediaIdsToCleanup = opinion.medias.map((m) => m.mediaId);
    await prisma_1.db.opinion.delete({ where: { id } });
    // Safely delete unreferenced media
    if (mediaIdsToCleanup.length > 0) {
        const { safeDeleteMedia } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        for (const mediaId of mediaIdsToCleanup) {
            await safeDeleteMedia(mediaId, prisma_1.db);
        }
    }
    return true;
};
const opinionService = {
    createOpinion,
    getOpinions,
    deleteOpinion
};
exports.default = opinionService;
