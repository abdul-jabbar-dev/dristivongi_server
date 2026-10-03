"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const media_controller_1 = __importDefault(require("./media.controller"));
const mediaRoute = (0, express_1.Router)();
mediaRoute.post("/import-url", auth_1.default, media_controller_1.default.importUrl);
exports.default = mediaRoute;
