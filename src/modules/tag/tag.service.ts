import { db } from "../../../lib/prisma";

const searchTags = async (query: string) => {
    const tags = await db.tag.findMany({
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

const getTagDetails = async (normalizedName: string) => {
    const tag = await db.tag.findUnique({
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

export const tagService = {
    searchTags,
    getTagDetails,
};
