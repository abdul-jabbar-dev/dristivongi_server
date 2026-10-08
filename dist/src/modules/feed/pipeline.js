"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedPipeline = void 0;
class FeedPipeline {
    stages;
    constructor(stages) {
        this.stages = stages;
    }
    async execute(context, candidates) {
        let current = candidates;
        for (const stage of this.stages) {
            current = await stage.execute(context, current);
        }
        return current;
    }
}
exports.FeedPipeline = FeedPipeline;
