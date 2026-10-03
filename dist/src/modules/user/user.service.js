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
                where: { email: user.email }
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
                    email: String(isUserExits.email),
                    fullName: String(isUserExits.fullName)
                }
            };
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
    login
};
exports.default = userService;
