import ENV from "../../../config";
import jwtService from "../../../lib/jwt";
import { db } from "../../../lib/prisma";
import crypto from "../../../sheare/decrypt";
import { UserQuery } from "./user.query";
import { TCreateUser } from "./user.zod";

const getAllUsers = async (query: UserQuery) => {
    try {
        const users = await db.user.findMany({
            where: {
                fullName: query.fullName,
                email: query.email
            }
        })
        return users
    } catch (error) {
        throw error;
    }
}

const register = async (user: TCreateUser) => {
    try {

        const password = await crypto.hashPass(user.password)

        const result = await db.$transaction(async (tx) => {
            const isUserExits = await tx.user.findFirst({
                where: {
                    email: user.email
                }
            })

            if (isUserExits) {
                throw new Error("User already exists")
            }

            const users = await tx.user.create({
                data: {
                    email: user.email,
                    fullName: user.fullName,
                }
            })

            await tx.userCredential.create({
                data: {
                    userId: users.id,
                    password: password
                }
            })

            return users
        })

        return result
    } catch (error) {
        throw error;
    }
}

const login = async (user: TCreateUser) => {
    try {

        const result = await db.$transaction(async (tx) => {
            const isUserExits = await tx.user.findFirst({
                where: { email: user.email }
            })

            if (!isUserExits) {
                throw new Error("User not found")
            }

            const isUserCredentialExits = await tx.userCredential.findFirst({
                where: { userId: isUserExits.id }
            })

            if (!isUserCredentialExits) {
                throw new Error("User not found")
            }

            const rawpassword = String(isUserCredentialExits.password);
            const passwordMatch = await crypto.comparePass(user.password, rawpassword)

            if (!passwordMatch) {
                throw new Error("Invalid password")
            }

            const AccessToken = jwtService.createToken({
                email: String(isUserExits.email),
                id: String(isUserExits.id),
                type: String(isUserExits.type)
            }, {
                expiresIn: ENV.JWT_ACCESS_TOKEN_EXPIRES_IN as string
            })

            const RefreshToken = jwtService.createToken({
                email: String(isUserExits.email),
                id: String(isUserExits.id),
                type: String(isUserExits.type)
            }, {
                expiresIn: ENV.JWT_REFRESH_TOKEN_EXPIRES_IN as string
            })

            await tx.userCredential.update({
                where: { userId: isUserExits.id },
                data: { refreshToken: RefreshToken }
            })


            return {
                AccessToken, RefreshToken, user: {
                    id: String(isUserExits.id),
                    email: String(isUserExits.email),
                    fullName: String(isUserExits.fullName)
                }
            }
        })

        return result
    } catch (error) {
        throw error;
    }
}

const userService = {
    getAllUsers,
    register,
    login
}

export default userService