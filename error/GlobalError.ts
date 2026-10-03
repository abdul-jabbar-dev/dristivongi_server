import { Response } from "express";


const GlobalError = (res: Response, error?: string | unknown, errorMessage?: string, statusCode?: number) => {


    const status = statusCode || 500
    const message = errorMessage || 'Failed to process request'

    // JavaScript Error objects have non-enumerable properties, so they stringify to {}
    // We explicitly extract the message and stack if it's an Error instance.
    let formattedError = error;
    if (error instanceof Error) {
        formattedError = {
            message: error.message,
            name: error.name,
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        };
    }

    res.status(status).json({
        success: false,
        message,
        error: formattedError
    })
}

export default GlobalError
