"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pick = (query, keys) => {
    return keys.reduce((acc, key) => {
        if (query[key]) {
            acc[key] = query[key];
        }
        return acc;
    }, {});
};
const Req = {
    pick
};
exports.default = Req;
