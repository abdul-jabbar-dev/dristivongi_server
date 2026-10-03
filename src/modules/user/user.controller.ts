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
        Res.send(res, other, 'User logged in successfully', 201)
    } catch (error) {
        GlobalError(res, error)
    }
}

const userController = {
    getAllUsers,
    register,
    login
}

export default userController