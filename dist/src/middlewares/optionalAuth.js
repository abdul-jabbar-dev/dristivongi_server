"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = __importDefault(require("../../lib/jwt"));
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer ")) {
            return next();
        }
        const accessToken = token.split(" ")[1];
        if (!accessToken) {
            return next();
        }
        let decoded;
        try {
            decoded = jwt_1.default.verifyToken(accessToken);
        }
        catch (e) {
            return next();
        }
        if (!decoded || decoded.type !== "access") {
            return next();
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        next();
    }
};
exports.default = optionalAuth;
