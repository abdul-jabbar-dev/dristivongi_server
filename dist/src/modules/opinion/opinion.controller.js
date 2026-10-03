"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = __importDefault(require("../../../sheare/response"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const opinion_service_1 = __importDefault(require("./opinion.service"));
const opinion_zod_1 = require("./opinion.zod");
const createOpinion = async (req, res) => {
    try {
        const payload = opinion_zod_1.createOpinionSchema.parse({ body: req.body }).body;
        const authorId = req.user.id;
        const files = req.files;
        const result = await opinion_service_1.default.createOpinion(payload, authorId, files);
        response_1.default.send(res, result, "Opinion added successfully", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 400);
    }
};
const getOpinions = async (req, res) => {
    try {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId)
            throw new Error("targetType and targetId are required");
        const result = await opinion_service_1.default.getOpinions(targetType, targetId);
        response_1.default.send(res, result, "Opinions retrieved successfully", 200);
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
