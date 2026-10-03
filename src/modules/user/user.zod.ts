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

const userZod = {
    createUserSchema,
    updatePasswordSchema,
    loginUserSchema
}
export default userZod