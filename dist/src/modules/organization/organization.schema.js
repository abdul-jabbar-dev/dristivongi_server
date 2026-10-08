"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrganizationSchema = exports.createOrganizationSchema = void 0;
const zod_1 = require("zod");
exports.createOrganizationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(100),
        description: zod_1.z.string().max(1000).optional(),
        organizationType: zod_1.z.string().min(2).max(50),
        visibility: zod_1.z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
        website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    }),
});
exports.updateOrganizationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string(),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).max(100).optional(),
        description: zod_1.z.string().max(1000).optional(),
        organizationType: zod_1.z.string().min(2).max(50).optional(),
        visibility: zod_1.z.enum(['PUBLIC', 'PRIVATE']).optional(),
        website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    }),
});
