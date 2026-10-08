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
const prisma_1 = require("../../../lib/prisma");
const jwt_1 = __importDefault(require("../../../lib/jwt"));
// Assuming bcryptjs or similar is used in the project. If not, this might need adjustment.
const bcrypt = __importStar(require("bcryptjs"));
const register = async (payload) => {
    // Basic implementation to stop errors. In a real scenario, check for existing users.
    const { email, password, fullName, userName } = payload;
    const existingUser = await prisma_1.db.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error("Email already in use");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma_1.db.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: {
                fullName,
                email,
                userName: userName || email.split("@")[0],
                userCredential: {
                    create: {
                        password: hashedPassword,
                    }
                }
            }
        });
        return createdUser;
    });
    const session = await prisma_1.db.session.create({
        data: {
            userId: user.id,
            refreshTokenId: `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
    });
    const accessToken = jwt_1.default.createToken({
        id: user.id,
        email: user.email,
        type: "access"
    }, { expiresIn: "15m" });
    const refreshToken = jwt_1.default.createToken({
        id: user.id,
        sessionId: session.refreshTokenId,
        type: "refresh"
    }, { expiresIn: "7d" });
    const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userName: user.userName,
        type: user.type,
    };
    return { user: safeUser, accessToken, refreshToken };
};
const login = async (payload) => {
    const { email, password } = payload;
    const user = await prisma_1.db.user.findUnique({
        where: { email },
        include: { userCredential: true, userProfile: true }
    });
    if (!user || !user.userCredential) {
        throw new Error("Invalid credentials");
    }
    const isMatch = await bcrypt.compare(password, user.userCredential.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
    }
    // Create session
    const session = await prisma_1.db.session.create({
        data: {
            userId: user.id,
            refreshTokenId: `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
    });
    const accessToken = jwt_1.default.createToken({
        id: user.id,
        email: user.email,
        type: "access"
    }, { expiresIn: "15m" });
    // Refresh token contains sessionId instead of just userId
    const refreshToken = jwt_1.default.createToken({
        id: user.id,
        sessionId: session.refreshTokenId,
        type: "refresh"
    }, { expiresIn: "7d" });
    // Remove sensitive data before returning
    const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userName: user.userName,
        type: user.type,
        userProfile: user.userProfile
    };
    return { user: safeUser, accessToken, refreshToken };
};
const refresh = async (refreshTokenString) => {
    // Decode token to find session ID
    const decoded = jwt_1.default.verifyToken(refreshTokenString);
    if (!decoded || !decoded.sessionId || decoded.type !== "refresh") {
        throw new Error("Invalid Token!");
    }
    const session = await prisma_1.db.session.findUnique({
        where: { refreshTokenId: decoded.sessionId }
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new Error("Unauthorized Access!");
    }
    if (session.userId !== decoded.id) {
        throw new Error("Unauthorized Access!");
    }
    const accessToken = jwt_1.default.createToken({
        id: session.userId,
        email: "",
        type: "access"
    }, { expiresIn: "15m" });
    return { accessToken };
};
const logout = async (refreshTokenString) => {
    const decoded = jwt_1.default.verifyToken(refreshTokenString);
    if (decoded && decoded.sessionId) {
        await prisma_1.db.session.update({
            where: { refreshTokenId: decoded.sessionId },
            data: { revokedAt: new Date() }
        }).catch(() => { });
    }
    return true;
};
const me = async (userId) => {
    const user = await prisma_1.db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
            type: true,
            createdAt: true,
            userProfile: true
        }
    });
    if (!user)
        throw new Error("User not found!");
    return user;
};
const authService = {
    register,
    login,
    refresh,
    logout,
    me
};
exports.default = authService;
