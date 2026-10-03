import { Request, Response, NextFunction } from "express";

const parseFormDataJson = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body.data) {
        try {
            req.body = JSON.parse(req.body.data);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid JSON in form data 'data' field" });
        }
    }
    next();
};

export default parseFormDataJson;
