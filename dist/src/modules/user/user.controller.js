"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = __importDefault(require("./user.service"));
const response_1 = __importDefault(require("../../../sheare/response"));
const request_1 = __importDefault(require("../../../sheare/request"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const config_1 = __importDefault(require("../../../config"));
const getAllUsers = async (req, res) => {
    try {
        const query = request_1.default.pick(req.query, ['fullName', 'email']);
        const users = await user_service_1.default.getAllUsers(query);
        response_1.default.send(res, users);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const register = async (req, res) => {
    try {
        console.log(req.body);
        const user = req.body;
        const users = await user_service_1.default.register(user);
        response_1.default.send(res, users, 'User created successfully', 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const login = async (req, res) => {
    try {
        const user = req.body;
        const users = await user_service_1.default.login(user);
        res.cookie("AccessToken", users.AccessToken, {
            secure: config_1.default.env === "production",
            httpOnly: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
        });
        // 2. Refresh Token (Long-lived: e.g., 7 days)
        res.cookie("RefreshToken", users.RefreshToken, {
            secure: config_1.default.env === "production",
            httpOnly: true, // Crucial for security
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        });
        const { AccessToken, RefreshToken, ...other } = users;
        response_1.default.send(res, other, 'User logged in successfully', 201);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const userController = {
    getAllUsers,
    register,
    login
};
exports.default = userController;
