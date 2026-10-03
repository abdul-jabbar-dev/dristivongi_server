import { db } from "../../../lib/prisma";
import jwtService from "../../../lib/jwt";
// Assuming bcryptjs or similar is used in the project. If not, this might need adjustment.
import * as bcrypt from "bcryptjs";
import { TRegister, TLogin } from "./auth.zod";

const register = async (payload: TRegister) => {
    // Basic implementation to stop errors. In a real scenario, check for existing users.
    const { email, password, fullName, userName } = payload;
    
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error("Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.$transaction(async (tx) => {
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

    const session = await db.session.create({
        data: {
            userId: user.id,
            refreshTokenId: `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
    });

    const accessToken = jwtService.createToken({
        id: user.id,
        email: user.email,
        type: "access"
    }, { expiresIn: "15m" });
    
    const refreshToken = jwtService.createToken({ 
        id: user.id, 
        sessionId: session.refreshTokenId,
        type: "refresh"
    } as any, { expiresIn: "7d" });

    const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userName: user.userName,
        type: user.type,
    };

    return { user: safeUser, accessToken, refreshToken };
};

const login = async (payload: TLogin) => {
    const { email, password } = payload;

    const user = await db.user.findUnique({
        where: { email },
        include: { userCredential: true }
    });

    if (!user || !user.userCredential) {
        throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.userCredential.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    // Create session
    const session = await db.session.create({
        data: {
            userId: user.id,
            refreshTokenId: `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
    });

    const accessToken = jwtService.createToken({
        id: user.id,
        email: user.email,
        type: "access"
    }, { expiresIn: "15m" });
    // Refresh token contains sessionId instead of just userId
    const refreshToken = jwtService.createToken({ 
        id: user.id, 
        sessionId: session.refreshTokenId,
        type: "refresh"
    } as any, { expiresIn: "7d" });

    // Remove sensitive data before returning
    const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userName: user.userName,
        type: user.type,
    };

    return { user: safeUser, accessToken, refreshToken };
};

const refresh = async (refreshTokenString: string) => {
    // Decode token to find session ID
    const decoded = jwtService.verifyToken(refreshTokenString) as any;
    if (!decoded || !decoded.sessionId || decoded.type !== "refresh") {
        throw new Error("Invalid Token!");
    }

    const session = await db.session.findUnique({
        where: { refreshTokenId: decoded.sessionId }
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new Error("Unauthorized Access!");
    }

    if (session.userId !== decoded.id) {
        throw new Error("Unauthorized Access!");
    }

    const accessToken = jwtService.createToken({
        id: session.userId,
        email: "",
        type: "access"
    }, { expiresIn: "15m" });
    return { accessToken };
};

const logout = async (refreshTokenString: string) => {
    const decoded = jwtService.verifyToken(refreshTokenString) as any;
    if (decoded && decoded.sessionId) {
        await db.session.update({
            where: { refreshTokenId: decoded.sessionId },
            data: { revokedAt: new Date() }
        }).catch(() => { /* Ignore if already deleted/revoked */ });
    }
    return true;
};

const me = async (userId: string) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
            type: true,
            createdAt: true,
        }
    });

    if (!user) throw new Error("User not found!");
    return user;
};

const authService = {
    register,
    login,
    refresh,
    logout,
    me
};

export default authService;
