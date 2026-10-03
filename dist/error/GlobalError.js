"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GlobalError = (res, error, errorMessage, statusCode) => {
    const status = statusCode || 500;
    const message = errorMessage || 'Failed to process request';
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
    });
};
exports.default = GlobalError;
