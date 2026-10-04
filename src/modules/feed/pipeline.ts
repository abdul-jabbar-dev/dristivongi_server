export interface FeedContext {
    userId?: string;
    sort: string;
    page: number;
    limit: number;
    tag?: string;
    author?: string;
    config: Record<string, any>;
}

export interface FeedCandidate {
    caseId: string;
    case: any;
    score: number;
    signals: Record<string, number>;
    reasons: string[];
    metadata: Record<string, any>;
}

export interface FeedPipelineStage {
    name: string;
    execute(context: FeedContext, candidates: FeedCandidate[]): Promise<FeedCandidate[]>;
}

export class FeedPipeline {
    constructor(private readonly stages: FeedPipelineStage[]) {}
    async execute(context: FeedContext, candidates: FeedCandidate[]): Promise<FeedCandidate[]> {
        let current = candidates;
        for (const stage of this.stages) {
            current = await stage.execute(context, current);
        }
        return current;
    }
}
