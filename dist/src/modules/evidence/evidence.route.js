"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const zod_1 = require("zod");
const evidence_controller_1 = __importDefault(require("./evidence.controller"));
const evidenceRoute = (0, express_1.Router)();
const validationSchema = zod_1.z.object({
    value: zod_1.z.enum(["VALID", "INVALID", "NONE"])
});
evidenceRoute.post("/:evidenceId/validation", auth_1.default, (0, validateRequest_1.default)(validationSchema), evidence_controller_1.default.submitValidation);
evidenceRoute.get("/:evidenceId/validation", evidence_controller_1.default.getValidationSummary);
exports.default = evidenceRoute;
