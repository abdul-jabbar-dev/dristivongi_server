import { Router } from "express";
import auth from "../../middlewares/auth"; 
import validateRequest from "../../middlewares/validateRequest";
import { z } from "zod";
import evidenceController from "./evidence.controller";

const evidenceRoute = Router();

const validationSchema = z.object({
    value: z.enum(["VALID", "INVALID"])
});

evidenceRoute.post(
    "/:evidenceId/validation",
    auth,
    validateRequest(validationSchema),
    evidenceController.submitValidation
);

evidenceRoute.get(
    "/:evidenceId/validation",
    evidenceController.getValidationSummary
);

export default evidenceRoute;
