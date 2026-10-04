import { Request, Response } from "express";

import Res from "../../../sheare/response";
import GlobalError from "../../../error/GlobalError";


import {
    TCreateCase,
    TCreateClaim,
} from "./case.zod";
import caseService from "./case.service";


/* =========================
   CREATE CASE
========================= */

const createNewCase = async (
    req: Request,
    res: Response
) => {

    try {

        const caseData: TCreateCase = req.body;

        const author = req.user.id;

        const files =
            (req.files as Express.Multer.File[]) || [];


        const result =
            await caseService.createNewCase(
                caseData,
                author,
                files
            );


        Res.send(
            res,
            result,
            "Case created successfully",
            201
        );

    } catch (error) {

        GlobalError(res, error);

    }
};


/* =========================
   GET NEWS FEED
========================= */

const getNewsFeed = async (
    req: Request,
    res: Response
) => {

    try {
        const tag = req.query.tag as string | undefined;
        const author = req.query.author as string | undefined;
        const result =
            await caseService.getNewsFeed(tag, author);


        Res.send(
            res,
            result,
            "News feed fetched successfully",
            200
        );

    } catch (error) {

        GlobalError(res, error);

    }
};


/* =========================
   GET CASE DETAILS
========================= */

const getCaseDetails = async (
    req: Request,
    res: Response
) => {

    try {

        const id = req.params.id;


        const result =
            await caseService.getCaseDetails(id);


        Res.send(
            res,
            result,
            "Case details fetched successfully",
            200
        );

    } catch (error) {

        GlobalError(res, error);

    }
};


/* =========================
   CREATE CLAIM
========================= */

const createClaim = async (
    req: Request,
    res: Response
) => {

    try {

        const caseId = req.params.caseId;

        const author = req.user.id;

        const claimData: TCreateClaim = req.body;

        const files =
            (req.files as Express.Multer.File[]) || [];


        const result =
            await caseService.createClaim(
                caseId,
                claimData,
                author,
                files
            );


        Res.send(
            res,
            result,
            "Claim created successfully",
            201
        );

    } catch (error) {

        GlobalError(res, error);

    }
};


/* =========================
   ADD EVIDENCE
========================= */

const addEvidence = async (req: Request, res: Response) => {
    try {
        const claimId = req.params.claimId;
        const author = req.user.id;
        const payload = req.body;
        const files = (req.files as Express.Multer.File[]) || [];

        const result = await caseService.addEvidenceToClaim(
            claimId,
            payload,
            author,
            files
        );

        Res.send(res, result, "Evidence added successfully", 201);
    } catch (error) {
        GlobalError(res, error);
    }
};

/* =========================
   ADD CASE EVIDENCE
========================= */

const addCaseEvidence = async (req: Request, res: Response) => {
    try {
        const caseId = req.params.caseId;
        const author = req.user.id;
        const payload = req.body;
        const files = (req.files as Express.Multer.File[]) || [];

        const result = await caseService.addEvidenceToCase(
            caseId,
            payload,
            author,
            files
        );

        Res.send(res, result, "Evidence added successfully", 201);
    } catch (error) {
        GlobalError(res, error);
    }
};

/* =========================
   SUBMIT ASSESSMENT
========================= */

const submitAssessment = async (req: Request, res: Response) => {
    try {
        const claimId = req.params.claimId;
        const author = req.user.id;
        const payload = req.body;

        const result = await caseService.submitAssessment(
            claimId,
            author,
            payload
        );

        Res.send(res, result, "Assessment submitted successfully", 201);
    } catch (error) {
        GlobalError(res, error);
    }
};

/* =========================
   GET ASSESSMENTS
========================= */

const getAssessments = async (req: Request, res: Response) => {
    try {
        const claimId = req.params.claimId;
        let authorId: string | undefined = undefined;

        const token = req.headers.authorization;
        if (token && token.startsWith("Bearer ")) {
            const accessToken = token.split(" ")[1];
            if (accessToken) {
                try {
                    const jwtService = require("../../../lib/jwt").default;
                    const decoded = jwtService.verifyToken(accessToken) as any;
                    if (decoded && decoded.type === "access") {
                        authorId = decoded.id;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        const result = await caseService.getAssessments(claimId, authorId);

        Res.send(res, result, "Assessments fetched successfully", 200);
    } catch (error) {
        GlobalError(res, error);
    }
};

/* =========================
   CONTROLLER OBJECT
========================= */

const caseController = {
    createNewCase,
    getNewsFeed,
    getCaseDetails,
    createClaim,
    addEvidence,
    addCaseEvidence,
    submitAssessment,
    getAssessments,
};

export default caseController;
