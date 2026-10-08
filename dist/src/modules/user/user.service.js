"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../../config"));
const jwt_1 = __importDefault(require("../../../lib/jwt"));
const prisma_1 = require("../../../lib/prisma");
const decrypt_1 = __importDefault(require("../../../sheare/decrypt"));
const getAllUsers = async (query) => {
    try {
        const users = await prisma_1.db.user.findMany({
            where: {
                fullName: query.fullName,
                email: query.email
            }
        });
        return users;
    }
    catch (error) {
        throw error;
    }
};
const register = async (user) => {
    try {
        const password = await decrypt_1.default.hashPass(user.password);
        const result = await prisma_1.db.$transaction(async (tx) => {
            const isUserExits = await tx.user.findFirst({
                where: {
                    email: user.email
                }
            });
            if (isUserExits) {
                throw new Error("User already exists");
            }
            const users = await tx.user.create({
                data: {
                    email: user.email,
                    fullName: user.fullName,
                }
            });
            await tx.userCredential.create({
                data: {
                    userId: users.id,
                    password: password
                }
            });
            return users;
        });
        return result;
    }
    catch (error) {
        throw error;
    }
};
const login = async (user) => {
    try {
        const result = await prisma_1.db.$transaction(async (tx) => {
            const isUserExits = await tx.user.findFirst({
                where: { email: user.email },
                include: { userProfile: true }
            });
            if (!isUserExits) {
                throw new Error("User not found");
            }
            const isUserCredentialExits = await tx.userCredential.findFirst({
                where: { userId: isUserExits.id }
            });
            if (!isUserCredentialExits) {
                throw new Error("User not found");
            }
            const rawpassword = String(isUserCredentialExits.password);
            const passwordMatch = await decrypt_1.default.comparePass(user.password, rawpassword);
            if (!passwordMatch) {
                throw new Error("Invalid password");
            }
            const AccessToken = jwt_1.default.createToken({
                email: String(isUserExits.email),
                id: String(isUserExits.id),
                type: String(isUserExits.type)
            }, {
                expiresIn: config_1.default.JWT_ACCESS_TOKEN_EXPIRES_IN
            });
            const RefreshToken = jwt_1.default.createToken({
                email: String(isUserExits.email),
                id: String(isUserExits.id),
                type: String(isUserExits.type)
            }, {
                expiresIn: config_1.default.JWT_REFRESH_TOKEN_EXPIRES_IN
            });
            await tx.userCredential.update({
                where: { userId: isUserExits.id },
                data: { refreshToken: RefreshToken }
            });
            return {
                AccessToken, RefreshToken, user: {
                    id: String(isUserExits.id),
                    userName: String(isUserExits.userName || ''),
                    email: String(isUserExits.email),
                    fullName: String(isUserExits.fullName),
                    userProfile: isUserExits.userProfile
                }
            };
        });
        return result;
    }
    catch (error) {
        throw error;
    }
};
const getUserProfile = async (username) => {
    try {
        const user = await prisma_1.db.user.findFirst({
            where: {
                OR: [
                    {
                        userName: {
                            equals: username,
                            mode: 'insensitive'
                        }
                    },
                    {
                        id: username
                    }
                ]
            },
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
                    select: {
                        cases: true,
                        claims: true,
                        evidence: true
                    }
                },
                organizationMemberships: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    catch (error) {
        throw error;
    }
};
const username_1 = require("../../utils/username");
const checkUsernameAvailability = async (username, currentUserId) => {
    const normalized = (0, username_1.normalizeUsername)(username);
    const validity = (0, username_1.isUsernameValid)(normalized);
    if (!validity.valid) {
        return { available: false, reason: validity.reason };
    }
    const whereClause = {
        userName: { equals: normalized, mode: 'insensitive' }
    };
    if (currentUserId) {
        whereClause.id = { not: currentUserId };
    }
    const existing = await prisma_1.db.user.findFirst({ where: whereClause });
    return { available: !existing };
};
const updateProfile = async (userId, data) => {
    try {
        const result = await prisma_1.db.$transaction(async (tx) => {
            if (data.fullName || data.userName) {
                const userUpdateData = {};
                if (data.fullName)
                    userUpdateData.fullName = data.fullName;
                if (data.userName) {
                    const normalized = (0, username_1.normalizeUsername)(data.userName);
                    const validity = (0, username_1.isUsernameValid)(normalized);
                    if (!validity.valid) {
                        throw new Error(validity.reason);
                    }
                    const existing = await tx.user.findFirst({
                        where: {
                            userName: { equals: normalized, mode: 'insensitive' },
                            id: { not: userId }
                        }
                    });
                    if (existing)
                        throw new Error("Username is already taken");
                    userUpdateData.userName = normalized;
                }
                await tx.user.update({
                    where: { id: userId },
                    data: userUpdateData
                });
            }
            const profileData = {};
            if (data.bio !== undefined)
                profileData.bio = data.bio;
            if (data.location !== undefined)
                profileData.location = data.location;
            if (data.website !== undefined)
                profileData.website = data.website;
            if (data.profilePicture !== undefined)
                profileData.profilePicture = data.profilePicture;
            if (data.coverPicture !== undefined)
                profileData.coverPicture = data.coverPicture;
            if (Object.keys(profileData).length > 0) {
                await tx.userProfile.upsert({
                    where: { userId },
                    update: profileData,
                    create: {
                        userId,
                        ...profileData
                    }
                });
            }
            return tx.user.findUnique({
                where: { id: userId },
                include: { userProfile: true }
            });
        });
        return result;
    }
    catch (error) {
        throw error;
    }
};
const userService = {
    getAllUsers,
    register,
    login,
    getUserProfile,
    updateProfile,
    checkUsernameAvailability
};
exports.default = userService;
