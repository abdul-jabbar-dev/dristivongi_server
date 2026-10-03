"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Handle media creation within a transaction
 */
const processAndCreateMedia = async (tx, files, fieldname) => {
    const relevantFiles = files.filter(f => f.fieldname === fieldname);
    const createdMedias = [];
    for (let i = 0; i < relevantFiles.length; i++) {
        const file = relevantFiles[i];
        const mediaUrl = file.location || file.path;
        const media = await tx.media.create({
            data: {
                url: mediaUrl,
                type: file.mimetype
            }
        });
        createdMedias.push({ mediaId: media.id, order: i });
    }
    return createdMedias;
};
const mediaService = {
    processAndCreateMedia,
};
exports.default = mediaService;
