"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = __importDefault(require("../../../sheare/response"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const case_service_1 = __importDefault(require("./case.service"));
/* =========================
   CREATE CASE
========================= */
const createNewCase = async (req, res) => {
    try {
        const caseData = req.body;
        const author = req.user.id;
        const files = req.files || [];
        const result = await case_service_1.default.createNewCase(caseData, author, files);
        response_1.default.send(res, result, "Case created successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   GET NEWS FEED
========================= */
const getNewsFeed = async (req, res) => {
    try {
        const tag = req.query.tag;
        const result = await case_service_1.default.getNewsFeed(tag);
        response_1.default.send(res, result, "News feed fetched successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   GET CASE DETAILS
========================= */
const getCaseDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const result = await case_service_1.default.getCaseDetails(id);
        response_1.default.send(res, result, "Case details fetched successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   CREATE CLAIM
========================= */
const createClaim = async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const author = req.user.id;
        const claimData = req.body;
        const files = req.files || [];
        const result = await case_service_1.default.createClaim(caseId, claimData, author, files);
        response_1.default.send(res, result, "Claim created successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   ADD EVIDENCE
========================= */
const addEvidence = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const author = req.user.id;
        const payload = req.body;
        const files = req.files || [];
        const result = await case_service_1.default.addEvidenceToClaim(claimId, payload, author, files);
        response_1.default.send(res, result, "Evidence added successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   ADD CASE EVIDENCE
========================= */
const addCaseEvidence = async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const author = req.user.id;
        const payload = req.body;
        const files = req.files || [];
        const result = await case_service_1.default.addEvidenceToCase(caseId, payload, author, files);
        response_1.default.send(res, result, "Evidence added successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   SUBMIT ASSESSMENT
========================= */
const submitAssessment = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const author = req.user.id;
        const payload = req.body;
        const result = await case_service_1.default.submitAssessment(claimId, author, payload);
        response_1.default.send(res, result, "Assessment submitted successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   GET ASSESSMENTS
========================= */
const getAssessments = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        let authorId = undefined;
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken);
                    if (decoded && decoded.type === "access") {
                        authorId = decoded.id;
                    }
                }
                catch (e) {
                    // ignore
                }
            }
        }
        const result = await case_service_1.default.getAssessments(claimId, authorId);
        response_1.default.send(res, result, "Assessments fetched successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   CONTROLLER OBJECT
========================= */
const caseController = {
    createNewCase,
    getNewsFeed,
    getCaseDetails,
    createClaim,
    addEvidence,
    addCaseEvidence,
    submitAssessment,
    getAssessments,
};
exports.default = caseController;
