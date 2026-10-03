import { Prisma } from "@prisma/client";

/**
 * Handle media creation within a transaction
 */
const processAndCreateMedia = async (
    tx: Prisma.TransactionClient,
    files: any[],
    fieldname: string
) => {
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

export default mediaService;
