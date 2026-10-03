import jwt from "jsonwebtoken";
import { TUserToken } from "./jwt.type";
import ENV from "../../config";


const createToken = (payload: TUserToken, options?: { expiresIn: string }) => {
    return jwt.sign(payload, ENV.JWT_SECRET!, { expiresIn: options?.expiresIn as any })
}



const verifyToken = (token: string) => {
    return jwt.verify(token, ENV.JWT_SECRET!)
}


const jwtService = {
    createToken,
    verifyToken
}

export default jwtService