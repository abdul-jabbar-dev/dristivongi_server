import { z } from "zod";

const createUserSchema = z.object({
    fullName: z.string().min(3, 'Full Name must be at least 3 characters long'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters long')
})

export type TCreateUser = z.infer<typeof createUserSchema>


const updatePasswordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters long')
})


const loginUserSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters long')
})

const updateProfileSchema = z.object({
    fullName: z.string().min(2, 'Full Name must be at least 2 characters long').optional(),
    userName: z.string().min(2, 'Username must be at least 2 characters long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
    bio: z.string().max(160, 'Bio cannot exceed 160 characters').optional(),
    location: z.string().max(100, 'Location cannot exceed 100 characters').optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    profilePicture: z.string().url('Invalid image URL').optional(),
    coverPicture: z.string().url('Invalid image URL').optional()
})

const userZod = {
    createUserSchema,
    updatePasswordSchema,
    loginUserSchema,
    updateProfileSchema
}
export default userZod