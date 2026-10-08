"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
const jwt_1 = __importDefault(require("../../lib/jwt"));
const GlobalError_1 = __importDefault(require("../../error/GlobalError"));
const prisma_1 = require("../../lib/prisma");
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer ")) {
            return (0, GlobalError_1.default)(res, null, "Unauthorized Access!", 401);
        }
        const accessToken = token.split(" ")[1];
        if (!accessToken) {
            return (0, GlobalError_1.default)(res, null, "Unauthorized Access!", 401);
        }
        let decoded;
        try {
            decoded = jwt_1.default.verifyToken(accessToken);
        }
        catch (e) {
            return (0, GlobalError_1.default)(res, null, "Invalid Token!", 401);
        }
        if (!decoded || decoded.type !== "access") {
            return (0, GlobalError_1.default)(res, null, "Invalid Token!", 401);
        }
        const user = await prisma_1.db.user.findUnique({
            where: { id: decoded.id }
        });
        if (!user) {
            return (0, GlobalError_1.default)(res, null, "User not found!", 404);
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, 'Authentication Failed', 500);
    }
};
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const decoded = jwt_1.default.verifyToken(accessToken);
                    if (decoded && decoded.type === "access") {
                        const user = await prisma_1.db.user.findUnique({ where: { id: decoded.id } });
                        if (user) {
                            req.user = decoded;
                        }
                    }
                }
                catch (e) { }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
exports.default = auth;
