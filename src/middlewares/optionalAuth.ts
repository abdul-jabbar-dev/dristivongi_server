import { NextFunction, Request, Response } from "express";
import jwtService from "../../lib/jwt";
import { TUserToken } from "../../lib/jwt/jwt.type";

const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer ")) {
            return next();
        }

        const accessToken = token.split(" ")[1];
        if (!accessToken) {
            return next();
        }

        let decoded;
        try {
            decoded = jwtService.verifyToken(accessToken) as TUserToken;
        } catch(e) {
            return next();
        }

        if(!decoded || decoded.type !== "access") {
            return next();
        }

        req.user = decoded; 
        next();
    } catch (error: any) {
        next();
    }
};

export default optionalAuth;
