"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const send = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};
const Res = {
    send
};
exports.default = Res;
