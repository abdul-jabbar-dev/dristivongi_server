import { db } from "../../../lib/prisma";
import { TCreateOpinion } from "./opinion.zod";
import mediaService from "../media/media.service";

const createOpinion = async (payload: TCreateOpinion, authorId: string, files?: Express.Multer.File[]) => {
    const { targetType, targetId, content, value, parentId, sources } = payload;
    
    if (!content?.trim() && (!files || files.length === 0) && (!sources || sources.length === 0)) {
        throw new Error("Comment must contain either text, files, or links");
    }

    // 1. Verify Target Exists
    let targetExists = false;
    if (targetType === "CASE") {
        targetExists = !!(await db.case.findUnique({ where: { id: targetId } }));
    } else if (targetType === "CLAIM") {
        targetExists = !!(await db.claim.findUnique({ where: { id: targetId } }));
    } else if (targetType === "EVIDENCE") {
        targetExists = !!(await db.evidence.findUnique({ where: { id: targetId } }));
    } else if (targetType === "SOURCE") {
        targetExists = !!(await db.source.findUnique({ where: { id: targetId } }));
    }

    if (!targetExists) {
        throw new Error("Target entity not found!");
    }

    if (parentId) {
        const parent = await db.opinion.findUnique({ where: { id: parentId } });
        if (!parent || parent.targetType !== targetType || parent.targetId !== targetId) {
            throw new Error("Invalid parent opinion thread!");
        }
    }

    // Process sources creation
    const sourceIds: string[] = [];
    if (sources && sources.length > 0) {
        for (const src of sources) {
            const newSource = await db.source.create({
                data: {
                    title: src.title,
                    sourceLocation: src.sourceLocation || "",
                    externalSourceType: src.externalSourceType,
                    externalSourceName: src.externalSourceName,
                    externalLinks: src.externalLinks || [],
                    createdBy: authorId
                }
            });
            sourceIds.push(newSource.id);
        }
    }

    // Create the opinion with medias and sources in a transaction
    const opinion = await db.$transaction(async (tx) => {
        const newOp = await tx.opinion.create({
            data: {
                content,
                value,
                targetType,
                targetId,
                authorId,
                parentId
            }
        });

        // Process media files
        const uploadedMedias = files?.length 
            ? await mediaService.processAndCreateMedia(tx, files, "files") 
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

    return await db.opinion.findUnique({
        where: { id: opinion.id },
        include: {
            author: { select: { id: true, fullName: true, userName: true, userProfile: { select: { profilePicture: true } } } },
            medias: { include: { media: true } },
            sources: { include: { source: true } }
        }
    });
};

const getOpinions = async (targetType: any, targetId: string) => {
    return await db.opinion.findMany({
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

const deleteOpinion = async (id: string, authorId: string) => {
    const opinion = await db.opinion.findUnique({ where: { id } });
    if (!opinion) throw new Error("Opinion not found!");
    if (opinion.authorId !== authorId) throw new Error("Unauthorized to delete this opinion!");

    await db.opinion.delete({ where: { id } });
    return true;
};

const opinionService = {
    createOpinion,
    getOpinions,
    deleteOpinion
};

export default opinionService;
