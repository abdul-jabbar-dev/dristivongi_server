import { Request, Response } from "express";
import Res from "../../../sheare/response";
import GlobalError from "../../../error/GlobalError";
import { tagService } from "./tag.service";

const searchTags = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string || "";
        const result = await tagService.searchTags(query);

        Res.send(res, result, "Tags fetched successfully", 200);
    } catch (error) {
        GlobalError(res, error);
    }
};

const getTagDetails = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const result = await tagService.getTagDetails(name.toLowerCase());

        Res.send(res, result, "Tag details fetched successfully", 200);
    } catch (error) {
        GlobalError(res, error);
    }
};

export const tagController = {
    searchTags,
    getTagDetails,
};
