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
                where: { email: user.email },
                include: { userProfile: true }
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
                    userName: String(isUserExits.userName || ''),
                    email: String(isUserExits.email),
                    fullName: String(isUserExits.fullName),
                    userProfile: isUserExits.userProfile
                }
            }
        })

        return result
    } catch (error) {
        throw error;
    }
}

const getUserProfile = async (username: string) => {
    try {
        const user = await db.user.findFirst({
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
    } catch (error) {
        throw error;
    }
}

import { normalizeUsername, isUsernameValid } from "../../utils/username";

const checkUsernameAvailability = async (username: string, currentUserId?: string) => {
    const normalized = normalizeUsername(username);
    const validity = isUsernameValid(normalized);
    
    if (!validity.valid) {
        return { available: false, reason: validity.reason };
    }

    const whereClause: any = {
        userName: { equals: normalized, mode: 'insensitive' }
    };
    
    if (currentUserId) {
        whereClause.id = { not: currentUserId };
    }

    const existing = await db.user.findFirst({ where: whereClause });
    return { available: !existing };
}

const updateProfile = async (userId: string, data: any) => {
    try {
        const result = await db.$transaction(async (tx) => {
            if (data.fullName || data.userName) {
                const userUpdateData: any = {};
                if (data.fullName) userUpdateData.fullName = data.fullName;
                if (data.userName) {
                    const normalized = normalizeUsername(data.userName);
                    const validity = isUsernameValid(normalized);
                    if (!validity.valid) {
                        throw new Error(validity.reason);
                    }

                    const existing = await tx.user.findFirst({
                        where: {
                            userName: { equals: normalized, mode: 'insensitive' },
                            id: { not: userId }
                        }
                    });
                    if (existing) throw new Error("Username is already taken");
                    userUpdateData.userName = normalized;
                }
                
                await tx.user.update({
                    where: { id: userId },
                    data: userUpdateData
                });
            }

            const profileData: any = {};
            if (data.bio !== undefined) profileData.bio = data.bio;
            if (data.location !== undefined) profileData.location = data.location;
            if (data.website !== undefined) profileData.website = data.website;
            if (data.profilePicture !== undefined) profileData.profilePicture = data.profilePicture;
            if (data.coverPicture !== undefined) profileData.coverPicture = data.coverPicture;

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
    } catch (error) {
        throw error;
    }
}

const userService = {
    getAllUsers,
    register,
    login,
    getUserProfile,
    updateProfile,
    checkUsernameAvailability
}

export default userService