import { Router } from "express";
import userController from "./user.controller"
import userZod from "./user.zod"
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { upload } from "../../lib/multer";
import parseFormDataJson from "../../middlewares/parseFormDataJson";



const userRoute = Router()


userRoute.get('/', (req, res) => {
    res.json({ message: 'User route' })
})


userRoute.get('/all', userController.getAllUsers)

userRoute.post('/register', validateRequest(userZod.createUserSchema), userController.register)

userRoute.post('/login', validateRequest(userZod.loginUserSchema), userController.login)

userRoute.get('/check-username', userController.checkUsername)

userRoute.get('/profile/:username', userController.getUserProfile)

userRoute.patch('/me/profile', auth, upload.any(), parseFormDataJson, validateRequest(userZod.updateProfileSchema), userController.updateProfile)

export default userRoute
