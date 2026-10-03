import { Request, Response } from "express";
import Res from "../../../sheare/response";
import GlobalError from "../../../error/GlobalError";
import authService from "./auth.service";

const register = async (req: Request, res: Response) => {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        Res.send(res, { user, accessToken }, "Registration successful", 201);
    } catch (error: any) {
        GlobalError(res, error, error.message, 400);
    }
};

const login = async (req: Request, res: Response) => {
    try {
        const { user, accessToken, refreshToken } = await authService.login(req.body);
        
        // Securely set the refresh token in an HTTP-Only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        Res.send(res, { user, accessToken }, "Login successful", 200);
    } catch (error) {
        GlobalError(res, error, undefined, 401);
    }
};

const refresh = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) throw new Error("Unauthorized Access!");

        const { accessToken } = await authService.refresh(refreshToken);
        Res.send(res, { accessToken }, "Token refreshed successfully", 200);
    } catch (error) {
        GlobalError(res, error, undefined, 401);
    }
};

const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/'
        };
        res.clearCookie('refreshToken', cookieOptions);
        Res.send(res, null, "Logged out successfully", 200);
    } catch (error) {
        res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
        Res.send(res, null, "Logged out safely", 200);
    }
};

const me = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await authService.me(userId);
        Res.send(res, result, "User retrieved", 200);
    } catch (error) {
        GlobalError(res, error, undefined, 401);
    }
};

const authController = {
    register,
    login,
    refresh,
    logout,
    me
};

export default authController;
