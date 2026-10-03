"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagService = void 0;
const prisma_1 = require("../../../lib/prisma");
const searchTags = async (query) => {
    const tags = await prisma_1.db.tag.findMany({
        where: {
            normalizedName: {
                startsWith: query.toLowerCase(),
            },
        },
        include: {
            _count: {
                select: { cases: true }
            }
        },
        take: 8,
        orderBy: {
            cases: {
                _count: 'desc'
            }
        }
    });
    return tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        normalizedName: tag.normalizedName,
        caseCount: tag._count.cases
    }));
};
const getTagDetails = async (normalizedName) => {
    const tag = await prisma_1.db.tag.findUnique({
        where: { normalizedName },
        include: {
            _count: {
                select: { cases: true }
            }
        }
    });
    if (!tag) {
        throw new Error("Tag not found");
    }
    return {
        ...tag,
        caseCount: tag._count.cases
    };
};
exports.tagService = {
    searchTags,
    getTagDetails,
};
