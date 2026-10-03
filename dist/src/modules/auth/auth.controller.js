"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = __importDefault(require("../../../sheare/response"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const auth_service_1 = __importDefault(require("./auth.service"));
const register = async (req, res) => {
    try {
        const { user, accessToken, refreshToken } = await auth_service_1.default.register(req.body);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        response_1.default.send(res, { user, accessToken }, "Registration successful", 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, error.message, 400);
    }
};
const login = async (req, res) => {
    try {
        const { user, accessToken, refreshToken } = await auth_service_1.default.login(req.body);
        // Securely set the refresh token in an HTTP-Only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        response_1.default.send(res, { user, accessToken }, "Login successful", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 401);
    }
};
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken)
            throw new Error("Unauthorized Access!");
        const { accessToken } = await auth_service_1.default.refresh(refreshToken);
        response_1.default.send(res, { accessToken }, "Token refreshed successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 401);
    }
};
const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            await auth_service_1.default.logout(refreshToken);
        }
        res.clearCookie('refreshToken', { path: '/' });
        response_1.default.send(res, null, "Logged out successfully", 200);
    }
    catch (error) {
        res.clearCookie('refreshToken', { path: '/' });
        response_1.default.send(res, null, "Logged out safely", 200);
    }
};
const me = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await auth_service_1.default.me(userId);
        response_1.default.send(res, result, "User retrieved", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, undefined, 401);
    }
};
const authController = {
    register,
    login,
    refresh,
    logout,
    me
};
exports.default = authController;
