import { Router } from "express";
import userController from "./user.controller"
import userZod from "./user.zod"
import validateRequest from "../../middlewares/validateRequest";



const userRoute = Router()


userRoute.get('/', (req, res) => {
    res.json({ message: 'User route' })
})


userRoute.get('/all', userController.getAllUsers)

userRoute.post('/register', validateRequest(userZod.createUserSchema), userController.register)

userRoute.post('/login', validateRequest(userZod.loginUserSchema), userController.login)



export default userRoute
