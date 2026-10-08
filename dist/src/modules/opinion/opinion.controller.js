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
const opinion_service_1 = __importDefault(require("./opinion.service"));
const opinion_zod_1 = require("./opinion.zod");
const privacy_utils_1 = require("../../utils/privacy.utils");
const createOpinion = async (req, res) => {
    try {
        const payload = opinion_zod_1.createOpinionSchema.parse({ body: req.body }).body;
        const authorId = req.user.id;
        const files = req.files;
        const result = await opinion_service_1.default.createOpinion(payload, authorId, files);
        response_1.default.send(res, (0, privacy_utils_1.sanitizeAnonymousOpinion)(result), "Opinion added successfully", 201);
    }
    catch (error) {
        // Clean up any files uploaded by multer if the process fails
        const { deleteMulterFiles } = await Promise.resolve().then(() => __importStar(require('../media/media.utils')));
        await deleteMulterFiles(req.files || []);
        (0, GlobalError_1.default)(res, error, undefined, 400);
    }
};
const getOpinions = async (req, res) => {
    try {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId)
            throw new Error("targetType and targetId are required");
        const result = await opinion_service_1.default.getOpinions(targetType, targetId);
        const sanitizedResult = result.map(privacy_utils_1.sanitizeAnonymousOpinion);
        response_1.default.send(res, sanitizedResult, "Opinions retrieved successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 400);
    }
};
const deleteOpinion = async (req, res) => {
    try {
        const opinionId = req.params.id;
        const authorId = req.user.id;
        await opinion_service_1.default.deleteOpinion(opinionId, authorId);
        response_1.default.send(res, null, "Opinion deleted successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 400);
    }
};
const opinionController = {
    createOpinion,
    getOpinions,
    deleteOpinion
};
exports.default = opinionController;
