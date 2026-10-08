"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAnonymousClaimUpdate = exports.sanitizeAnonymousSource = exports.sanitizeAnonymousOpinion = exports.sanitizeAnonymousEvidence = exports.sanitizeAnonymousClaim = exports.sanitizeAnonymousCase = exports.toPublicAuthorDTO = exports.ANONYMOUS_AUTHOR_PAYLOAD = void 0;
exports.ANONYMOUS_AUTHOR_PAYLOAD = {
    id: "anonymous",
    isAnonymous: true,
    displayName: "Anonymous Contributor",
    fullName: "Anonymous Contributor",
    userName: null,
    profilePicture: null
};
const toPublicAuthorDTO = (author, isAnonymous) => {
    if (!author)
        return null;
    if (isAnonymous) {
        return exports.ANONYMOUS_AUTHOR_PAYLOAD;
    }
    return author;
};
exports.toPublicAuthorDTO = toPublicAuthorDTO;
const sanitizeAnonymousCase = (caseItem) => {
    if (!caseItem)
        return caseItem;
    const isAnonymous = caseItem.isAnonymous === true;
    const sanitized = {
        ...caseItem,
        author: (0, exports.toPublicAuthorDTO)(caseItem.author, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.authorId;
    }
    // Handle nested claims
    if (sanitized.claims && Array.isArray(sanitized.claims)) {
        sanitized.claims = sanitized.claims.map(exports.sanitizeAnonymousClaim);
    }
    return sanitized;
};
exports.sanitizeAnonymousCase = sanitizeAnonymousCase;
const sanitizeAnonymousClaim = (claimItem) => {
    if (!claimItem)
        return claimItem;
    const isAnonymous = claimItem.isAnonymous === true;
    const sanitized = {
        ...claimItem,
        creator: (0, exports.toPublicAuthorDTO)(claimItem.creator, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.createdBy;
    }
    // Handle nested evidence
    if (sanitized.evidence && Array.isArray(sanitized.evidence)) {
        sanitized.evidence = sanitized.evidence.map((ce) => {
            if (ce.evidence) {
                return {
                    ...ce,
                    evidence: (0, exports.sanitizeAnonymousEvidence)(ce.evidence)
                };
            }
            return ce;
        });
    }
    return sanitized;
};
exports.sanitizeAnonymousClaim = sanitizeAnonymousClaim;
const sanitizeAnonymousEvidence = (evidenceItem) => {
    if (!evidenceItem)
        return evidenceItem;
    const isAnonymous = evidenceItem.isAnonymous === true;
    const sanitized = {
        ...evidenceItem,
        submitter: (0, exports.toPublicAuthorDTO)(evidenceItem.submitter, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.submittedBy;
    }
    return sanitized;
};
exports.sanitizeAnonymousEvidence = sanitizeAnonymousEvidence;
const sanitizeAnonymousOpinion = (opinionItem) => {
    if (!opinionItem)
        return opinionItem;
    const isAnonymous = opinionItem.isAnonymous === true;
    const sanitized = {
        ...opinionItem,
        author: (0, exports.toPublicAuthorDTO)(opinionItem.author, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.authorId;
    }
    // Handle nested replies
    if (sanitized.replies && Array.isArray(sanitized.replies)) {
        sanitized.replies = sanitized.replies.map(exports.sanitizeAnonymousOpinion);
    }
    // Handle sources
    if (sanitized.sources && Array.isArray(sanitized.sources)) {
        sanitized.sources = sanitized.sources.map((os) => {
            if (os.source) {
                return { ...os, source: (0, exports.sanitizeAnonymousSource)(os.source) };
            }
            return os;
        });
    }
    return sanitized;
};
exports.sanitizeAnonymousOpinion = sanitizeAnonymousOpinion;
const sanitizeAnonymousSource = (sourceItem) => {
    if (!sourceItem)
        return sourceItem;
    const isAnonymous = sourceItem.isAnonymous === true;
    const sanitized = {
        ...sourceItem,
        creator: (0, exports.toPublicAuthorDTO)(sourceItem.creator, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.createdBy;
    }
    return sanitized;
};
exports.sanitizeAnonymousSource = sanitizeAnonymousSource;
const sanitizeAnonymousClaimUpdate = (updateItem) => {
    if (!updateItem)
        return updateItem;
    const isAnonymous = updateItem.isAnonymous === true;
    const sanitized = {
        ...updateItem,
        author: (0, exports.toPublicAuthorDTO)(updateItem.author, isAnonymous),
    };
    if (isAnonymous) {
        delete sanitized.createdBy;
    }
    if (sanitized.evidence && Array.isArray(sanitized.evidence)) {
        sanitized.evidence = sanitized.evidence.map((cue) => {
            if (cue.evidence) {
                return {
                    ...cue,
                    evidence: (0, exports.sanitizeAnonymousEvidence)(cue.evidence)
                };
            }
            return cue;
        });
    }
    if (sanitized.sources && Array.isArray(sanitized.sources)) {
        sanitized.sources = sanitized.sources.map((cus) => {
            if (cus.source) {
                return {
                    ...cus,
                    source: (0, exports.sanitizeAnonymousSource)(cus.source)
                };
            }
            return cus;
        });
    }
    return sanitized;
};
exports.sanitizeAnonymousClaimUpdate = sanitizeAnonymousClaimUpdate;
