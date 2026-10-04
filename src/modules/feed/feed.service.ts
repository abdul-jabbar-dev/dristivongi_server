import { FeedContext } from './pipeline';
import { RecentCasesSource } from './sources';
import { FeedProfiles } from './profiles';
import { RANKING_CONFIG } from './config';

class FeedService {
    async getNewsFeed(context: FeedContext) {
        const candidateSource = new RecentCasesSource();
        let candidates = await candidateSource.getCandidates(context);
        
        // Deduplication
        const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.caseId, c])).values());
        
        const sortType = (context.sort || 'recent').toLowerCase();
        let pipeline = (FeedProfiles as any)[sortType];
        if (!pipeline) pipeline = FeedProfiles.recent;
        
        const rankedCandidates = await pipeline.execute(context, uniqueCandidates);
        
        const startIndex = (context.page - 1) * context.limit;
        const endIndex = startIndex + context.limit;
        const pagedCandidates = rankedCandidates.slice(startIndex, endIndex);
        
        const caseList = pagedCandidates.map((c:any) => ({
            id: c.case.id,
            title: c.case.title,
            titleHtml: c.case.titleHtml,
            location: c.case.location,
            createdAt: c.case.createdAt,
            updatedAt: c.case.updatedAt,
            author: {
                id: c.case.author.id,
                fullName: c.case.author.fullName,
                userName: c.case.author.userName,
                profilePicture: c.case.author.userProfile?.profilePicture,
                isVerified: false,
            },
            stats: {
                supportCount: c.case._count?.caseReactions || 0,
                opposeCount: 0,
                viewCount: c.case._count?.caseViews || 0,
                discussionCount: c.case._count?.discussions || 0,
                evidenceCount: c.case._count?.evidence || 0,
                sourceCount: c.case._count?.sources || 0,
                claimCount: c.case._count?.claims || 0,
            },
            claims: c.case.claims || [],
            tags: c.case.tags || [],
            reaction: c.case.caseReactions ? {
                support: c.case.caseReactions.filter((r: any) => r.value === 'SUPPORT').length,
                oppose: c.case.caseReactions.filter((r: any) => r.value === 'OPPOSE').length,
                total: c.case.caseReactions.length,
                currentUserReaction: context.userId ? c.case.caseReactions.find((r: any) => r.userId === context.userId)?.value || null : null
            } : undefined
        }));
        
        return {
            data: caseList,
            nextPage: endIndex < rankedCandidates.length ? context.page + 1 : null
        };
    }
}

export const feedService = new FeedService();
