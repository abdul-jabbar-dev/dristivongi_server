"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedProfiles = void 0;
const pipeline_1 = require("./pipeline");
const stages_1 = require("./stages");
exports.FeedProfiles = {
    recent: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('createdAt')
    ]),
    popular: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.EngagementStage(),
        new stages_1.AuthorDiversityStage(),
        new stages_1.SortStage('engagement')
    ]),
    trending: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.FreshnessStage(),
        new stages_1.TrendingStage(),
        new stages_1.AuthorDiversityStage(),
        new stages_1.SortStage('trending')
    ]),
    most_supported: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('supportCount')
    ]),
    most_viewed: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('views')
    ]),
    most_discussed: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('discussions')
    ]),
    most_validated: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('evidence')
    ]),
    nearby: new pipeline_1.FeedPipeline([
        new stages_1.ModerationFilterStage(),
        new stages_1.SortStage('createdAt')
    ])
};
