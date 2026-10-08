import { NextFunction, Request, Response } from "express";
import jwtService from "../../lib/jwt";
import GlobalError from "../../error/GlobalError";
import { TUserToken } from "../../lib/jwt/jwt.type";
import { db } from "../../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user: TUserToken;
    }
  }
}

const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer ")) {
            return GlobalError(res, null, "Unauthorized Access!", 401);
        }

        const accessToken = token.split(" ")[1];
        if (!accessToken) {
            return GlobalError(res, null, "Unauthorized Access!", 401);
        }

        let decoded;
        try {
            decoded = jwtService.verifyToken(accessToken) as TUserToken;
        } catch(e) {
            return GlobalError(res, null, "Invalid Token!", 401);
        }

        if(!decoded || decoded.type !== "access") {
            return GlobalError(res, null, "Invalid Token!", 401);
        }

        const user = await db.user.findUnique({
             where: { id: decoded.id }
        });

        if(!user) {
             return GlobalError(res, null, "User not found!", 404);
        }

        req.user = decoded; 
        next();
    } catch (error: any) {
        GlobalError(res, error, 'Authentication Failed', 500);
    }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const decoded = jwtService.verifyToken(accessToken) as TUserToken;
                    if (decoded && decoded.type === "access") {
                        const user = await db.user.findUnique({ where: { id: decoded.id } });
                        if (user) {
                            req.user = decoded;
                        }
                    }
                } catch(e) {}
            }
        }
        next();
    } catch (error) {
        next();
    }
};

export default auth;
