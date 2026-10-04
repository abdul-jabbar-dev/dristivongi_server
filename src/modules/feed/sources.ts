import { db } from '../../../lib/prisma';
import { FeedContext, FeedCandidate } from './pipeline';

export class RecentCasesSource {
    name = 'recent';
    async getCandidates(context: FeedContext): Promise<FeedCandidate[]> {
        let whereClause: any = { caseStatus: 'SHOW' };
        if (context.tag) {
            whereClause.tags = { some: { tag: { normalizedName: context.tag.toLowerCase() } } };
        }
        if (context.author) {
            whereClause.author = { userName: { equals: context.author, mode: 'insensitive' } };
        }

        const cases = await db.case.findMany({
            where: whereClause,
            take: 200,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { id: true, fullName: true, userName: true, userProfile: true } },
                _count: { select: { caseReactions: true, discussions: true, evidence: true, sources: true, caseViews: true, claims: true } },
                caseReactions: { select: { value: true } },
                claims: { take: 1, select: { title: true } }
            }
        });

        return cases.map(c => ({
            caseId: c.id,
            case: c,
            score: 0,
            signals: {},
            reasons: [this.name],
            metadata: {}
        }));
    }
}
