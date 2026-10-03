import express from "express";
import { tagController } from "./tag.controller";

const router = express.Router();

router.get("/search", tagController.searchTags);
router.get("/:name", tagController.getTagDetails);

export const tagRoutes = router;
