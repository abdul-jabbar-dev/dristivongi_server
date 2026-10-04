"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const createUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(3, 'Full Name must be at least 3 characters long'),
    email: zod_1.z.string().email('Invalid email'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long')
});
const updatePasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters long')
});
const loginUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long')
});
const updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Full Name must be at least 2 characters long').optional(),
    userName: zod_1.z.string().min(2, 'Username must be at least 2 characters long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
    bio: zod_1.z.string().max(160, 'Bio cannot exceed 160 characters').optional(),
    location: zod_1.z.string().max(100, 'Location cannot exceed 100 characters').optional(),
    website: zod_1.z.string().url('Invalid website URL').optional().or(zod_1.z.literal('')),
    profilePicture: zod_1.z.string().url('Invalid image URL').optional(),
    coverPicture: zod_1.z.string().url('Invalid image URL').optional()
});
const userZod = {
    createUserSchema,
    updatePasswordSchema,
    loginUserSchema,
    updateProfileSchema
};
exports.default = userZod;
