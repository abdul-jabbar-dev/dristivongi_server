"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = __importDefault(require("http-status"));
const response_1 = __importDefault(require("../../../sheare/response"));
const evidence_service_1 = __importDefault(require("./evidence.service"));
const submitValidation = async (req, res) => {
    const { evidenceId } = req.params;
    const { value } = req.body;
    const userId = req.user.id;
    const result = await evidence_service_1.default.submitValidation(evidenceId, userId, value);
    response_1.default.send(res, result, "Validation submitted successfully", http_status_1.default.OK);
};
const getValidationSummary = async (req, res) => {
    const { evidenceId } = req.params;
    // We optionally extract userId if an auth token was provided, but if not we pass null
    const userId = req.user?.id || null;
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
            const decoded = jwtService.verifyToken(token);
            extractedUserId = decoded?.id || decoded?.user?.id || decoded;
        }
        catch (e) {
            // ignore
        }
    }
    const result = await evidence_service_1.default.getValidationSummary(evidenceId, extractedUserId);
    response_1.default.send(res, result, "Validation summary fetched successfully", http_status_1.default.OK);
};
exports.default = {
    submitValidation,
    getValidationSummary,
};
