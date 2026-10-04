import { Request, Response } from "express";
import userService from "./user.service";
import Res from "../../../sheare/response";
import Req from "../../../sheare/request";
import { UserQuery } from "./user.query";
import GlobalError from "../../../error/GlobalError";
import { TCreateUser } from "./user.zod";
import ENV from "../../../config";


const getAllUsers = async (req: Request, res: Response) => {
    try {
        const query = Req.pick<UserQuery>(req.query, ['fullName', 'email'])
        const users = await userService.getAllUsers(query)
        Res.send(res, users)
    } catch (error) {
        GlobalError(res, error)
    }
}


const register = async (req: Request, res: Response) => {
    try {
        console.log(req.body)
        const user: TCreateUser = req.body;
        const users = await userService.register(user)
        Res.send(res, users, 'User created successfully', 201)
    } catch (error) {
        GlobalError(res, error)
    }
}


const login = async (req: Request, res: Response) => {
    try {
        const user: TCreateUser = req.body;
        const users: {
            AccessToken: string;
            RefreshToken: string;
            user: {
                id: string;
                email: string;
                fullName: string;
            };
        } = await userService.login(user)

        res.cookie("AccessToken", users.AccessToken, {
            secure: ENV.env === "production",
            httpOnly: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
        });

        // 2. Refresh Token (Long-lived: e.g., 7 days)
        res.cookie("RefreshToken", users.RefreshToken, {
            secure: ENV.env === "production",
            httpOnly: true, // Crucial for security
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        });


        const { AccessToken, RefreshToken, ...other } = users;
        Res.send(res, { ...other, accessToken: AccessToken }, 'User logged in successfully', 201)
    } catch (error) {
        GlobalError(res, error)
    }
}

const getUserProfile = async (req: Request, res: Response) => {
    try {
        let username = req.params.username;
        let currentUserId: string | undefined = undefined;

        // Extract token to allow 'me' routing or self-identification
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken) as any;
                    if (decoded && decoded.id) {
                        currentUserId = decoded.id;
                    }
                } catch (e) {}
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
            if (!profile) throw new Error("User not found");
            return Res.send(res, profile, "Profile retrieved successfully");
        }

        const profile = await userService.getUserProfile(username);
        Res.send(res, profile, "Profile retrieved successfully");
    } catch (error: any) {
        if (error.message === "User not found") {
            GlobalError(res, error, error.message, 404);
        } else {
            GlobalError(res, error);
        }
    }
}

const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const payload = req.body;
        const files = (req.files as any[]) || [];
        
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

        const result = await userService.updateProfile(userId, payload);
        Res.send(res, result, "Profile updated successfully");
    } catch (error: any) {
        GlobalError(res, error, error.message, 400);
    }
}

const checkUsername = async (req: Request, res: Response) => {
    try {
        const username = req.query.username as string;
        let currentUserId: string | undefined = undefined;
        
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken) as any;
                    if (decoded && decoded.id) {
                        currentUserId = decoded.id;
                    }
                } catch (e) {}
            }
        }
        
        if (!username) {
            return Res.send(res, { available: false, reason: "Username is required" });
        }

        const result = await userService.checkUsernameAvailability(username, currentUserId);
        Res.send(res, result);
    } catch (error: any) {
        GlobalError(res, error, error.message, 400);
    }
}

const userController = {
    getAllUsers,
    register,
    login,
    getUserProfile,
    updateProfile,
    checkUsername
}

export default userController