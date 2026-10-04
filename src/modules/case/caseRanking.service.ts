import { db } from "../../../lib/prisma";
import { RANKING_CONFIG } from "./ranking.config";

export class CaseRankingService {

    // Helper to get candidate cases for expensive sorting
    private async getCandidates(limit: number, recentOnlyDays?: number, tag?: string, author?: string) {
        let whereClause: any = { caseStatus: "SHOW" };

        if (recentOnlyDays) {
            whereClause.updatedAt = {
                gte: new Date(Date.now() - recentOnlyDays * 24 * 60 * 60 * 1000)
            };
        }
        if (tag) {
            whereClause.tags = { some: { tag: { normalizedName: tag.toLowerCase() } } };
        }
        if (author) {
            whereClause.author = { userName: { equals: author, mode: 'insensitive' } };
        }

        const cases = await db.case.findMany({
            where: whereClause,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                author: {
                    select: { id: true, fullName: true, userName: true, userProfile: true }
                },
                _count: {
                    select: {
                        caseReactions: true,
                        discussions: true,
                        evidence: true,
                        sources: true,
                        caseViews: true,
                        claims: true
                    }
                },
                caseReactions: {
                    select: { value: true }
                },
                claims: {
                    take: 1,
                    select: { title: true }
                }
            }
        });
        return cases;
    }

    public async getRecentCases(tag?: string, author?: string) {
        return this.getCandidates(50, undefined, tag, author);
    }

    public async getTrendingCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(RANKING_CONFIG.TRENDING_CANDIDATE_LIMIT, RANKING_CONFIG.TRENDING_CANDIDATE_WINDOW_DAYS, tag, author);

        const now = Date.now();
        const ranked = candidates.map((c: any) => {
            // For MVP trending, we approximate velocity using simple counts since we lack detailed timeseries metrics
            // In a real prod environment we would query activity in the last 24h vs previous 24h
            const recentEngagements =
                (c._count.caseViews * RANKING_CONFIG.TRENDING_VIEW_WEIGHT) +
                (c._count.caseReactions * RANKING_CONFIG.TRENDING_REACTION_WEIGHT) +
                (c._count.discussions * RANKING_CONFIG.TRENDING_DISCUSSION_WEIGHT) +
                (c._count.evidence * RANKING_CONFIG.TRENDING_EVIDENCE_WEIGHT);

            const ageHours = (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
            const decay = Math.exp(-ageHours / RANKING_CONFIG.TRENDING_HALF_LIFE_HOURS);
            const score = recentEngagements * decay;

            return { ...c, _rankingScore: score };
        });

        return ranked.sort((a: any, b: any) => b._rankingScore - a._rankingScore);
    }

    public async getPopularCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(RANKING_CONFIG.POPULAR_CANDIDATE_LIMIT, undefined, tag, author);

        const ranked = candidates.map((c: any) => {
            const score =
                (Math.log1p(c._count.caseViews) * RANKING_CONFIG.POPULAR_VIEW_WEIGHT) +
                (Math.log1p(c._count.caseReactions) * RANKING_CONFIG.POPULAR_SUPPORT_WEIGHT) +
                (Math.log1p(c._count.discussions) * RANKING_CONFIG.POPULAR_DISCUSSION_WEIGHT) +
                (Math.log1p(c._count.evidence) * RANKING_CONFIG.POPULAR_EVIDENCE_WEIGHT);

            return { ...c, _rankingScore: score };
        });

        return ranked.sort((a: any, b: any) => b._rankingScore - a._rankingScore);
    }

    public async getMostSupportedCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);

        const ranked = candidates.map((c: any) => {
            const support = c.caseReactions.filter((r: any) => r.value === 'SUPPORT').length;
            const oppose = c.caseReactions.filter((r: any) => r.value === 'OPPOSE').length;
            const total = support + oppose;

            // Wilson score lower bound approximation for sorting
            let score = 0;
            if (total > 0) {
                const z = 1.96;
                const phat = support / total;
                score = (phat + z * z / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)) / (1 + z * z / total);
                score *= Math.log1p(total); // Give volume a boost
            }
            return { ...c, _rankingScore: score };
        });

        return ranked.sort((a: any, b: any) => b._rankingScore - a._rankingScore);
    }

    public async getMostViewedCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a: any, b: any) => b._count.caseViews - a._count.caseViews);
    }

    public async getMostDiscussedCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a: any, b: any) => b._count.discussions - a._count.discussions);
    }

    public async getMostReferencedCases(tag?: string, author?: string) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a: any, b: any) => b._count.sources - a._count.sources);
    }

    public async getMostValidatedCases(tag?: string, author?: string) {
        // Ideally we need to count EvidenceValidation for this case
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a: any, b: any) => b._count.evidence - a._count.evidence); // Approx for now without heavy joins
    }

    public async getNearbyCases(tag?: string, author?: string) {
        // Since we only have location as a string, return them by creation for now, frontend would filter or we filter by user's location
        return this.getCandidates(100, undefined, tag, author);
    }
}

export const caseRankingService = new CaseRankingService();
