import { Router } from "express";
import opinionController from "./opinion.controller";
import auth from "../../middlewares/auth";
import parseFormDataJson from "../../middlewares/parseFormDataJson";
import { upload } from "../../lib/multer";

const router = Router();

router.post("/", 
    auth, 
    upload.array("files"),
    parseFormDataJson,
    opinionController.createOpinion
);
router.get("/", opinionController.getOpinions);
router.delete("/:id", auth, opinionController.deleteOpinion);

export default router;
