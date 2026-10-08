"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortStage = exports.AuthorDiversityStage = exports.TrendingStage = exports.EngagementStage = exports.FreshnessStage = exports.ModerationFilterStage = void 0;
class ModerationFilterStage {
    name = 'moderation_filter';
    async execute(context, candidates) {
        return candidates.filter(c => c.case.caseStatus === 'SHOW');
    }
}
exports.ModerationFilterStage = ModerationFilterStage;
class FreshnessStage {
    name = 'freshness';
    async execute(context, candidates) {
        const now = Date.now();
        const halfLifeHours = context.config.TRENDING_HALF_LIFE_HOURS || 48;
        return candidates.map(c => {
            const ageHours = (now - new Date(c.case.createdAt).getTime()) / (1000 * 60 * 60);
            c.signals.freshness = Math.exp(-ageHours / halfLifeHours);
            return c;
        });
    }
}
exports.FreshnessStage = FreshnessStage;
class EngagementStage {
    name = 'engagement';
    async execute(context, candidates) {
        return candidates.map(c => {
            const views = c.case._count?.caseViews || 0;
            const reactions = c.case._count?.caseReactions || 0;
            const discussions = c.case._count?.discussions || 0;
            const evidence = c.case._count?.evidence || 0;
            c.signals.engagement =
                (Math.log1p(views) * (context.config.POPULAR_VIEW_WEIGHT || 1.0)) +
                    (Math.log1p(reactions) * (context.config.POPULAR_SUPPORT_WEIGHT || 2.0)) +
                    (Math.log1p(discussions) * (context.config.POPULAR_DISCUSSION_WEIGHT || 1.5)) +
                    (Math.log1p(evidence) * (context.config.POPULAR_EVIDENCE_WEIGHT || 3.0));
            return c;
        });
    }
}
exports.EngagementStage = EngagementStage;
class TrendingStage {
    name = 'trending';
    async execute(context, candidates) {
        return candidates.map(c => {
            const views = c.case._count?.caseViews || 0;
            const reactions = c.case._count?.caseReactions || 0;
            const discussions = c.case._count?.discussions || 0;
            const evidence = c.case._count?.evidence || 0;
            const recentEngagements = (views * (context.config.TRENDING_VIEW_WEIGHT || 1.0)) +
                (reactions * (context.config.TRENDING_REACTION_WEIGHT || 2.0)) +
                (discussions * (context.config.TRENDING_DISCUSSION_WEIGHT || 3.0)) +
                (evidence * (context.config.TRENDING_EVIDENCE_WEIGHT || 5.0));
            c.signals.trending = recentEngagements * (c.signals.freshness || 1);
            return c;
        });
    }
}
exports.TrendingStage = TrendingStage;
class AuthorDiversityStage {
    name = 'author_diversity';
    async execute(context, candidates) {
        const authorCounts = {};
        return candidates.map(c => {
            const authorId = c.case.author?.id;
            if (authorId) {
                const count = authorCounts[authorId] || 0;
                authorCounts[authorId] = count + 1;
                if (count > 2) {
                    c.score *= 0.8;
                    c.reasons.push('author_diversity_penalty');
                }
            }
            return c;
        });
    }
}
exports.AuthorDiversityStage = AuthorDiversityStage;
class SortStage {
    scoreSignal;
    name = 'sort';
    constructor(scoreSignal) {
        this.scoreSignal = scoreSignal;
    }
    async execute(context, candidates) {
        candidates.forEach(c => {
            if (this.scoreSignal === 'createdAt') {
                c.score = new Date(c.case.createdAt).getTime();
            }
            else if (this.scoreSignal === 'supportCount') {
                const support = c.case.caseReactions?.filter((r) => r.value === 'SUPPORT').length || 0;
                const oppose = c.case.caseReactions?.filter((r) => r.value === 'OPPOSE').length || 0;
                const total = support + oppose;
                if (total > 0) {
                    const z = 1.96;
                    const phat = support / total;
                    c.score = ((phat + z * z / (2 * total) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)) / (1 + z * z / total)) * Math.log1p(total);
                }
                else
                    c.score = 0;
            }
            else if (this.scoreSignal === 'views') {
                c.score = c.case._count?.caseViews || 0;
            }
            else if (this.scoreSignal === 'discussions') {
                c.score = c.case._count?.discussions || 0;
            }
            else if (this.scoreSignal === 'evidence') {
                c.score = c.case._count?.evidence || 0;
            }
            else {
                c.score = c.signals[this.scoreSignal] || c.score;
            }
        });
        return candidates.sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            const timeA = new Date(a.case.createdAt).getTime();
            const timeB = new Date(b.case.createdAt).getTime();
            if (timeB !== timeA)
                return timeB - timeA;
            return a.caseId.localeCompare(b.caseId);
        });
    }
}
exports.SortStage = SortStage;
