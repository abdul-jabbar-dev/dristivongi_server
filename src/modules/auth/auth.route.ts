import { Router } from "express";
import authController from "./auth.controller";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", auth, authController.me);

export default router;
