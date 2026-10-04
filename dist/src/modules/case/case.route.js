"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = require("../../lib/multer");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const parseFormDataJson_1 = __importDefault(require("../../middlewares/parseFormDataJson"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const case_controller_1 = __importDefault(require("./case.controller"));
const case_zod_1 = __importDefault(require("./case.zod"));
const caseRoute = (0, express_1.Router)();
/* =========================
   CREATE CASE
========================= */
caseRoute.post("/create_case", auth_1.default, multer_1.upload.any(), parseFormDataJson_1.default, (0, validateRequest_1.default)(case_zod_1.default.createCaseSchema), case_controller_1.default.createNewCase);
/* =========================
   NEWS FEED
========================= */
caseRoute.get("/get_case/news_feed", case_controller_1.default.getNewsFeed);
/* =========================
   CASE DETAILS
========================= */
caseRoute.get("/get_case/:id", case_controller_1.default.getCaseDetails);
caseRoute.post("/case_view/:id", case_controller_1.default.recordCaseView);
/* =========================
   CREATE CLAIM
========================= */
caseRoute.post("/:caseId/create_claim", auth_1.default, multer_1.upload.any(), parseFormDataJson_1.default, (0, validateRequest_1.default)(case_zod_1.default.createClaimSchema), case_controller_1.default.createClaim);
/* =========================
/* =========================
   ADD EVIDENCE TO CLAIM
========================= */
caseRoute.post("/:claimId/add_evidence", auth_1.default, multer_1.upload.any(), parseFormDataJson_1.default, (0, validateRequest_1.default)(case_zod_1.default.addEvidenceSchema), case_controller_1.default.addEvidence);
caseRoute.post("/:caseId/case_evidence", auth_1.default, multer_1.upload.any(), parseFormDataJson_1.default, (0, validateRequest_1.default)(case_zod_1.default.addEvidenceSchema), case_controller_1.default.addCaseEvidence);
/* =========================
   ASSESSMENTS
========================= */
caseRoute.post("/:claimId/assessment", auth_1.default, (0, validateRequest_1.default)(case_zod_1.default.submitAssessmentSchema), case_controller_1.default.submitAssessment);
// We use an optional auth middleware here if we want to extract authorId for currentUserPosition
caseRoute.get("/:claimId/assessment", 
// auth middleware isn't strictly needed to VIEW, but we need it to know currentUserPosition
// we can skip it or create an optionalAuth middleware. Let's assume frontend passes a token if available,
// we'll just allow any, or just use `auth` for now if the app requires login to view details.
// Wait, let's just not put auth middleware here, we will fetch user manually in controller if token is present, 
// or just leave it open and currentUserPosition will be null.
// Let's use `auth` since we can assume users are logged in to see details, 
// OR wait, `getCaseDetails` doesn't require auth! So let's NOT require auth.
// If the frontend needs to know its own position, we might need an optional auth.
// I'll just skip the auth middleware here. The controller will just not have req.user if no token.
case_controller_1.default.getAssessments);
/* =========================
   CASE REACTIONS
========================= */
caseRoute.post("/:caseId/reaction", auth_1.default, (0, validateRequest_1.default)(case_zod_1.default.submitCaseReactionSchema), case_controller_1.default.submitCaseReaction);
exports.default = caseRoute;
