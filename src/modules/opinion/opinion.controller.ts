import { Request, Response } from "express";
import Res from "../../../sheare/response";
import GlobalError from "../../../error/GlobalError";
import opinionService from "./opinion.service";
import { createOpinionSchema } from "./opinion.zod";
import { sanitizeAnonymousOpinion } from "../../utils/privacy.utils";

const createOpinion = async (req: Request, res: Response) => {
    try {
        const payload = createOpinionSchema.parse({ body: req.body }).body;
        const authorId = req.user.id;
        const files = req.files as Express.Multer.File[] | undefined;
        const result = await opinionService.createOpinion(payload, authorId, files);
        Res.send(res, sanitizeAnonymousOpinion(result), "Opinion added successfully", 201);
    } catch (error) {
        // Clean up any files uploaded by multer if the process fails
        const { deleteMulterFiles } = await import('../media/media.utils');
        await deleteMulterFiles(req.files || []);
        
        GlobalError(res, error, undefined, 400);
    }
};

const getOpinions = async (req: Request, res: Response) => {
    try {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId) throw new Error("targetType and targetId are required");
        
        const result = await opinionService.getOpinions(targetType as any, targetId as string);
        const sanitizedResult = result.map(sanitizeAnonymousOpinion);
        Res.send(res, sanitizedResult, "Opinions retrieved successfully", 200);
    } catch (error) {
        GlobalError(res, error, undefined, 400);
    }
};

const deleteOpinion = async (req: Request, res: Response) => {
    try {
        const opinionId = req.params.id;
        const authorId = req.user.id;
        await opinionService.deleteOpinion(opinionId, authorId);
        Res.send(res, null, "Opinion deleted successfully", 200);
    } catch (error) {
        GlobalError(res, error, undefined, 400);
    }
};

const opinionController = {
    createOpinion,
    getOpinions,
    deleteOpinion
};

export default opinionController;
