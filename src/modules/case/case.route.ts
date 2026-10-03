import { Router } from "express";
import { upload } from "../../lib/multer";
import auth from "../../middlewares/auth";
import parseFormDataJson from "../../middlewares/parseFormDataJson";
import validateRequest from "../../middlewares/validateRequest";
import caseController from "./case.controller";
import caseZod from "./case.zod";

const caseRoute = Router();


/* =========================
   CREATE CASE
========================= */

caseRoute.post(
    "/create_case",
    auth,
    upload.any(),
    parseFormDataJson,
    validateRequest(caseZod.createCaseSchema),
    caseController.createNewCase
);


/* =========================
   NEWS FEED
========================= */

caseRoute.get(
    "/get_case/news_feed",
    caseController.getNewsFeed
);


/* =========================
   CASE DETAILS
========================= */

caseRoute.get(
    "/get_case/:id",
    caseController.getCaseDetails
);


/* =========================
   CREATE CLAIM
========================= */

caseRoute.post(
    "/:caseId/create_claim",
    auth,
    upload.any(),
    parseFormDataJson,
    validateRequest(caseZod.createClaimSchema),
    caseController.createClaim
);


/* =========================
/* =========================
   ADD EVIDENCE TO CLAIM
========================= */

caseRoute.post(
    "/:claimId/add_evidence",
    auth,
    upload.any(),
    parseFormDataJson,
    validateRequest(caseZod.addEvidenceSchema),
    caseController.addEvidence
);

caseRoute.post(
    "/:caseId/case_evidence",
    auth,
    upload.any(),
    parseFormDataJson,
    validateRequest(caseZod.addEvidenceSchema),
    caseController.addCaseEvidence
);

/* =========================
   ASSESSMENTS
========================= */

caseRoute.post(
    "/:claimId/assessment",
    auth,
    validateRequest(caseZod.submitAssessmentSchema),
    caseController.submitAssessment
);

// We use an optional auth middleware here if we want to extract authorId for currentUserPosition
caseRoute.get(
    "/:claimId/assessment",
    // auth middleware isn't strictly needed to VIEW, but we need it to know currentUserPosition
    // we can skip it or create an optionalAuth middleware. Let's assume frontend passes a token if available,
    // we'll just allow any, or just use `auth` for now if the app requires login to view details.
    // Wait, let's just not put auth middleware here, we will fetch user manually in controller if token is present, 
    // or just leave it open and currentUserPosition will be null.
    // Let's use `auth` since we can assume users are logged in to see details, 
    // OR wait, `getCaseDetails` doesn't require auth! So let's NOT require auth.
    // If the frontend needs to know its own position, we might need an optional auth.
    // I'll just skip the auth middleware here. The controller will just not have req.user if no token.
    caseController.getAssessments
);

export default caseRoute;