import { Response } from "express";

const send = <T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    })
}

 


const Res = {
    send
}

export default Res