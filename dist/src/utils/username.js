"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUsernameValid = exports.normalizeUsername = void 0;
const normalizeUsername = (username) => {
    if (!username)
        return '';
    // Lowercase, remove whitespace, keep only alphanumeric and underscores
    let normalized = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    // Trim leading/trailing underscores just in case
    normalized = normalized.replace(/^_+|_+$/g, '');
    return normalized;
};
exports.normalizeUsername = normalizeUsername;
const isUsernameValid = (username) => {
    if (!username)
        return { valid: false, reason: 'Username is required' };
    if (username.length < 3)
        return { valid: false, reason: 'Username must be at least 3 characters' };
    if (username.length > 20)
        return { valid: false, reason: 'Username cannot exceed 20 characters' };
    if (!/^[a-z0-9_]+$/.test(username)) {
        return { valid: false, reason: 'Username can only contain letters, numbers, and underscores' };
    }
    const reservedNames = ['admin', 'api', 'login', 'signup', 'settings', 'profile', 'about', 'support', 'null', 'undefined', 'me'];
    if (reservedNames.includes(username)) {
        return { valid: false, reason: 'This username is reserved and cannot be used' };
    }
    return { valid: true };
};
exports.isUsernameValid = isUsernameValid;
