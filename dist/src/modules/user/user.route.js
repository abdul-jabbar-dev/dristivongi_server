"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("./user.controller"));
const user_zod_1 = __importDefault(require("./user.zod"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const userRoute = (0, express_1.Router)();
userRoute.get('/', (req, res) => {
    res.json({ message: 'User route' });
});
userRoute.get('/all', user_controller_1.default.getAllUsers);
userRoute.post('/register', (0, validateRequest_1.default)(user_zod_1.default.createUserSchema), user_controller_1.default.register);
userRoute.post('/login', (0, validateRequest_1.default)(user_zod_1.default.loginUserSchema), user_controller_1.default.login);
exports.default = userRoute;
