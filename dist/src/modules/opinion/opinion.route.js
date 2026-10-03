"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const opinion_controller_1 = __importDefault(require("./opinion.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const parseFormDataJson_1 = __importDefault(require("../../middlewares/parseFormDataJson"));
const multer_1 = require("../../lib/multer");
const router = (0, express_1.Router)();
router.post("/", auth_1.default, multer_1.upload.array("files"), parseFormDataJson_1.default, opinion_controller_1.default.createOpinion);
router.get("/", opinion_controller_1.default.getOpinions);
router.delete("/:id", auth_1.default, opinion_controller_1.default.deleteOpinion);
exports.default = router;
