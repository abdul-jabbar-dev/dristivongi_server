"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseRankingService = exports.CaseRankingService = void 0;
const prisma_1 = require("../../../lib/prisma");
const ranking_config_1 = require("./ranking.config");
class CaseRankingService {
    // Helper to get candidate cases for expensive sorting
    async getCandidates(limit, recentOnlyDays, tag, author) {
        let whereClause = { caseStatus: "SHOW" };
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
        const cases = await prisma_1.db.case.findMany({
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
    async getRecentCases(tag, author) {
        return this.getCandidates(50, undefined, tag, author);
    }
    async getTrendingCases(tag, author) {
        const candidates = await this.getCandidates(ranking_config_1.RANKING_CONFIG.TRENDING_CANDIDATE_LIMIT, ranking_config_1.RANKING_CONFIG.TRENDING_CANDIDATE_WINDOW_DAYS, tag, author);
        const now = Date.now();
        const ranked = candidates.map((c) => {
            // For MVP trending, we approximate velocity using simple counts since we lack detailed timeseries metrics
            // In a real prod environment we would query activity in the last 24h vs previous 24h
            const recentEngagements = (c._count.caseViews * ranking_config_1.RANKING_CONFIG.TRENDING_VIEW_WEIGHT) +
                (c._count.caseReactions * ranking_config_1.RANKING_CONFIG.TRENDING_REACTION_WEIGHT) +
                (c._count.discussions * ranking_config_1.RANKING_CONFIG.TRENDING_DISCUSSION_WEIGHT) +
                (c._count.evidence * ranking_config_1.RANKING_CONFIG.TRENDING_EVIDENCE_WEIGHT);
            const ageHours = (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
            const decay = Math.exp(-ageHours / ranking_config_1.RANKING_CONFIG.TRENDING_HALF_LIFE_HOURS);
            const score = recentEngagements * decay;
            return { ...c, _rankingScore: score };
        });
        return ranked.sort((a, b) => b._rankingScore - a._rankingScore);
    }
    async getPopularCases(tag, author) {
        const candidates = await this.getCandidates(ranking_config_1.RANKING_CONFIG.POPULAR_CANDIDATE_LIMIT, undefined, tag, author);
        const ranked = candidates.map((c) => {
            const score = (Math.log1p(c._count.caseViews) * ranking_config_1.RANKING_CONFIG.POPULAR_VIEW_WEIGHT) +
                (Math.log1p(c._count.caseReactions) * ranking_config_1.RANKING_CONFIG.POPULAR_SUPPORT_WEIGHT) +
                (Math.log1p(c._count.discussions) * ranking_config_1.RANKING_CONFIG.POPULAR_DISCUSSION_WEIGHT) +
                (Math.log1p(c._count.evidence) * ranking_config_1.RANKING_CONFIG.POPULAR_EVIDENCE_WEIGHT);
            return { ...c, _rankingScore: score };
        });
        return ranked.sort((a, b) => b._rankingScore - a._rankingScore);
    }
    async getMostSupportedCases(tag, author) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        const ranked = candidates.map((c) => {
            const support = c.caseReactions.filter((r) => r.value === 'SUPPORT').length;
            const oppose = c.caseReactions.filter((r) => r.value === 'OPPOSE').length;
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
        return ranked.sort((a, b) => b._rankingScore - a._rankingScore);
    }
    async getMostViewedCases(tag, author) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a, b) => b._count.caseViews - a._count.caseViews);
    }
    async getMostDiscussedCases(tag, author) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a, b) => b._count.discussions - a._count.discussions);
    }
    async getMostReferencedCases(tag, author) {
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a, b) => b._count.sources - a._count.sources);
    }
    async getMostValidatedCases(tag, author) {
        // Ideally we need to count EvidenceValidation for this case
        const candidates = await this.getCandidates(1000, undefined, tag, author);
        return candidates.sort((a, b) => b._count.evidence - a._count.evidence); // Approx for now without heavy joins
    }
    async getNearbyCases(tag, author) {
        // Since we only have location as a string, return them by creation for now, frontend would filter or we filter by user's location
        return this.getCandidates(100, undefined, tag, author);
    }
}
exports.CaseRankingService = CaseRankingService;
exports.caseRankingService = new CaseRankingService();
