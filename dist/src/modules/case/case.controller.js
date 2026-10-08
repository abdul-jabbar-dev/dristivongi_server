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
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   GET NEWS FEED
========================= */
const getNewsFeed = async (req, res) => {
    try {
        const tag = req.query.tag;
        const author = req.query.author;
        let currentUserId = undefined;
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken);
                    if (decoded && decoded.type === "access") {
                        currentUserId = decoded.id;
                    }
                }
                catch (e) {
                    // ignore
                }
            }
        }
        const sort = req.query.sort;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await case_service_1.default.getNewsFeed(tag, author, currentUserId, sort, page, limit);
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
        const result = await case_service_1.default.getCaseDetails(id, authorId);
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
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
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
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
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
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
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
   CASE REACTIONS
========================= */
const submitCaseReaction = async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const authorId = req.user.id;
        const reactionData = req.body;
        const result = await case_service_1.default.submitCaseReaction(caseId, authorId, reactionData);
        response_1.default.send(res, result, "Reaction submitted successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   RECORD CASE VIEW
========================================================= */
const recordCaseView = async (req, res) => {
    try {
        const caseId = req.params.id;
        let userId = undefined;
        let visitorKey = undefined;
        if (req.user && req.user.id) {
            userId = req.user.id;
        }
        else {
            const ip = req.ip || req.socket?.remoteAddress || 'unknown';
            const ua = req.headers['user-agent'] || 'unknown';
            visitorKey = Buffer.from(`${ip}-${ua}`).toString('base64');
        }
        const result = await case_service_1.default.recordCaseView(caseId, userId, visitorKey);
        response_1.default.send(res, result, "View recorded successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
/* =========================
   CLAIM UPDATES
========================= */
const createClaimUpdate = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const userId = req.user.id;
        const updateData = req.body;
        const files = req.files || [];
        const result = await case_service_1.default.createClaimUpdate(claimId, updateData, userId, files);
        response_1.default.send(res, result, "Claim update created successfully", 201);
    }
    catch (error) {
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
        (0, GlobalError_1.default)(res, error);
    }
};
const getClaimUpdates = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const cursor = req.query.cursor ? req.query.cursor : undefined;
        const result = await case_service_1.default.getClaimUpdates(claimId, limit, cursor);
        response_1.default.send(res, result, "Claim updates retrieved successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const getClaimUpdatePermissions = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const userId = req.user?.id;
        const result = await case_service_1.default.getClaimUpdatePermissions(claimId, userId);
        response_1.default.send(res, result, "Claim update permissions retrieved successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const updateCaseSettings = async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const userId = req.user.id;
        const settingsData = req.body;
        const result = await case_service_1.default.updateCaseSettings(caseId, settingsData, userId);
        response_1.default.send(res, result, "Case settings updated successfully", 200);
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
    submitCaseReaction,
    recordCaseView,
    createClaimUpdate,
    getClaimUpdates,
    getClaimUpdatePermissions,
    updateCaseSettings,
};
exports.default = caseController;
