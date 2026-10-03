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
const userZod = {
    createUserSchema,
    updatePasswordSchema,
    loginUserSchema
};
exports.default = userZod;
