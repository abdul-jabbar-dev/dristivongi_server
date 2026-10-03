import { z } from "zod";

const validator = (schema: z.ZodTypeAny, data: Request['body']) => {
    return schema.safeParse(data)
}


export default validator