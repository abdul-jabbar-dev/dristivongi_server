"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validator = (schema, data) => {
    return schema.safeParse(data);
};
exports.default = validator;
