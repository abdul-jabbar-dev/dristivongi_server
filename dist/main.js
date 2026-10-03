"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const prisma_1 = require("./lib/prisma");
prisma_1.db.$connect().then(() => {
    console.log('Database connected');
}).catch((error) => {
    console.error('Database connection failed:', error);
});
app_1.default.listen(config_1.default.PORT, () => {
    console.log(`Server is running on port ${config_1.default.PORT}`);
});
