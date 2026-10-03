import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';

const validateRequest = (schema: ZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {

    await schema.parseAsync(req.body);
    return next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: error
    });
  }
};

export default validateRequest;
