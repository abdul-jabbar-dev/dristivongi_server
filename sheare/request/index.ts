import { Request } from "express";

const pick = <T>(query: Request['query'], keys: (keyof T)[]) => {
    return keys.reduce((acc, key) => {
        if (query[key as keyof typeof query]) {
            acc[key as keyof T] = query[key] as unknown as T[keyof T]
        }
        return acc
    }, {} as T)
}

const Req = {
    pick
}

export default Req