import { Request, Response } from "express"; 
import httpStatus from "http-status";
import Res from "../../../sheare/response";
import evidenceService from "./evidence.service";

const submitValidation = async (req: Request, res: Response) => {
    const { evidenceId } = req.params;
    const { value } = req.body;
    const userId = (req as any).user.id;

    const result = await evidenceService.submitValidation(evidenceId, userId, value);

    Res.send(res, result, "Validation submitted successfully", httpStatus.OK);
};

const getValidationSummary = async (req: Request, res: Response) => {
    const { evidenceId } = req.params;
    // We optionally extract userId if an auth token was provided, but if not we pass null
    const userId = (req as any).user?.id || null; 

    // Note: If you have a custom auth middleware that always rejects unauthenticated requests,
    // you might need to handle this manually or create an optionalAuth middleware.
    // For now, let's just assume we try to parse the token if it exists in headers to get userId,
    // or just rely on the service to calculate aggregate if userId is missing.
    let extractedUserId = userId;
    if (!extractedUserId && req.headers.authorization) {
        try {
            let token = req.headers.authorization;
            if (token.startsWith("Bearer ")) {
                token = token.slice(7);
            }
            const jwtService = require("../../../lib/jwt").default;
            const decoded = jwtService.verifyToken(token) as any;
            extractedUserId = decoded?.id || (decoded as any)?.user?.id || decoded;
        } catch (e) {
            // ignore
        }
    }

    const result = await evidenceService.getValidationSummary(evidenceId, extractedUserId);

    Res.send(res, result, "Validation summary fetched successfully", httpStatus.OK);
};

export default {
    submitValidation,
    getValidationSummary,
};
