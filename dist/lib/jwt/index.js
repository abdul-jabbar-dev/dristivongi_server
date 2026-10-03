"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../config"));
const createToken = (payload, options) => {
    return jsonwebtoken_1.default.sign(payload, config_1.default.JWT_SECRET, { expiresIn: options?.expiresIn });
};
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.JWT_SECRET);
};
const jwtService = {
    createToken,
    verifyToken
};
exports.default = jwtService;
