import { FeedPipeline } from './pipeline';
import { ModerationFilterStage, FreshnessStage, EngagementStage, TrendingStage, AuthorDiversityStage, SortStage } from './stages';

export const FeedProfiles = {
    recent: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('createdAt')
    ]),
    popular: new FeedPipeline([
        new ModerationFilterStage(),
        new EngagementStage(),
        new AuthorDiversityStage(),
        new SortStage('engagement')
    ]),
    trending: new FeedPipeline([
        new ModerationFilterStage(),
        new FreshnessStage(),
        new TrendingStage(),
        new AuthorDiversityStage(),
        new SortStage('trending')
    ]),
    most_supported: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('supportCount')
    ]),
    most_viewed: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('views')
    ]),
    most_discussed: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('discussions')
    ]),
    most_validated: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('evidence')
    ]),
    nearby: new FeedPipeline([
        new ModerationFilterStage(),
        new SortStage('createdAt')
    ])
};
