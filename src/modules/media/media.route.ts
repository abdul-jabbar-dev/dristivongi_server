import { Router } from "express";
import auth from "../../middlewares/auth";
import mediaController from "./media.controller";

const mediaRoute = Router();

mediaRoute.post(
    "/import-url",
    auth,
    mediaController.importUrl
);

export default mediaRoute;
