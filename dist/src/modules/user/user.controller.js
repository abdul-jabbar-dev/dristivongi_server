"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = __importDefault(require("./user.service"));
const response_1 = __importDefault(require("../../../sheare/response"));
const request_1 = __importDefault(require("../../../sheare/request"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const config_1 = __importDefault(require("../../../config"));
const getAllUsers = async (req, res) => {
    try {
        const query = request_1.default.pick(req.query, ['fullName', 'email']);
        const users = await user_service_1.default.getAllUsers(query);
        response_1.default.send(res, users);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const register = async (req, res) => {
    try {
        console.log(req.body);
        const user = req.body;
        const users = await user_service_1.default.register(user);
        response_1.default.send(res, users, 'User created successfully', 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const login = async (req, res) => {
    try {
        const user = req.body;
        const users = await user_service_1.default.login(user);
        res.cookie("AccessToken", users.AccessToken, {
            secure: config_1.default.env === "production",
            httpOnly: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
        });
        // 2. Refresh Token (Long-lived: e.g., 7 days)
        res.cookie("RefreshToken", users.RefreshToken, {
            secure: config_1.default.env === "production",
            httpOnly: true, // Crucial for security
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        });
        const { AccessToken, RefreshToken, ...other } = users;
        response_1.default.send(res, { ...other, accessToken: AccessToken }, 'User logged in successfully', 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const getUserProfile = async (req, res) => {
    try {
        let username = req.params.username;
        let currentUserId = undefined;
        // Extract token to allow 'me' routing or self-identification
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken);
                    if (decoded && decoded.id) {
                        currentUserId = decoded.id;
                    }
                }
                catch (e) { }
            }
        }
        if (username === 'me' || username === 'undefined' || username === 'null') {
            if (!currentUserId) {
                throw new Error("User not found");
            }
            // Fetch by ID
            const { db } = require("../../../lib/prisma");
            const profile = await db.user.findUnique({
                where: { id: currentUserId },
                select: {
                    id: true,
                    fullName: true,
                    userName: true,
                    createdAt: true,
                    userProfile: {
                        select: {
                            profilePicture: true,
                            coverPicture: true,
                            bio: true,
                            location: true,
                            website: true
                        }
                    },
                    _count: {
                        select: { cases: true, claims: true, evidence: true }
                    }
                }
            });
            if (!profile)
                throw new Error("User not found");
            return response_1.default.send(res, profile, "Profile retrieved successfully");
        }
        const profile = await user_service_1.default.getUserProfile(username);
        response_1.default.send(res, profile, "Profile retrieved successfully");
    }
    catch (error) {
        if (error.message === "User not found") {
            (0, GlobalError_1.default)(res, error, error.message, 404);
        }
        else {
            (0, GlobalError_1.default)(res, error);
        }
    }
};
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const payload = req.body;
        const files = req.files || [];
        const profilePicture = files.find(f => f.fieldname === 'profilePicture');
        if (profilePicture) {
            let loc = profilePicture.location || (profilePicture.path ? `/uploads/${profilePicture.filename}` : undefined);
            if (loc && loc.includes('.storage.supabase.co')) {
                loc = loc.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            }
            payload.profilePicture = loc;
        }
        const coverPicture = files.find(f => f.fieldname === 'coverPicture');
        if (coverPicture) {
            let loc = coverPicture.location || (coverPicture.path ? `/uploads/${coverPicture.filename}` : undefined);
            if (loc && loc.includes('.storage.supabase.co')) {
                loc = loc.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            }
            payload.coverPicture = loc;
        }
        const result = await user_service_1.default.updateProfile(userId, payload);
        response_1.default.send(res, result, "Profile updated successfully");
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, error.message, 400);
    }
};
const checkUsername = async (req, res) => {
    try {
        const username = req.query.username;
        let currentUserId = undefined;
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken);
                    if (decoded && decoded.id) {
                        currentUserId = decoded.id;
                    }
                }
                catch (e) { }
            }
        }
        if (!username) {
            return response_1.default.send(res, { available: false, reason: "Username is required" });
        }
        const result = await user_service_1.default.checkUsernameAvailability(username, currentUserId);
        response_1.default.send(res, result);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, error.message, 400);
    }
};
const userController = {
    getAllUsers,
    register,
    login,
    getUserProfile,
    updateProfile,
    checkUsername
};
exports.default = userController;
