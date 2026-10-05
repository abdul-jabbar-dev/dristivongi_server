export const ANONYMOUS_AUTHOR_PAYLOAD = {
  isAnonymous: true,
  displayName: "Anonymous Contributor",
  profilePicture: null
};

export const toPublicAuthorDTO = (author: any, isAnonymous: boolean) => {
  if (!author) return null;
  if (isAnonymous) {
      return ANONYMOUS_AUTHOR_PAYLOAD;
  }
  return author;
};

export const sanitizeAnonymousCase = (caseItem: any) => {
  if (!caseItem) return caseItem;
  
  const isAnonymous = caseItem.isAnonymous === true;
  
  const sanitized = {
      ...caseItem,
      author: toPublicAuthorDTO(caseItem.author, isAnonymous),
  };

  if (isAnonymous) {
      delete sanitized.authorId;
  }

  // Handle nested claims
  if (sanitized.claims && Array.isArray(sanitized.claims)) {
      sanitized.claims = sanitized.claims.map(sanitizeAnonymousClaim);
  }

  return sanitized;
};

export const sanitizeAnonymousClaim = (claimItem: any) => {
  if (!claimItem) return claimItem;

  const isAnonymous = claimItem.isAnonymous === true;

  const sanitized = {
      ...claimItem,
      creator: toPublicAuthorDTO(claimItem.creator, isAnonymous),
  };

  if (isAnonymous) {
      delete sanitized.createdBy;
  }

  // Handle nested evidence
  if (sanitized.evidence && Array.isArray(sanitized.evidence)) {
      sanitized.evidence = sanitized.evidence.map((ce: any) => {
          if (ce.evidence) {
              return {
                  ...ce,
                  evidence: sanitizeAnonymousEvidence(ce.evidence)
              };
          }
          return ce;
      });
  }

  return sanitized;
};

export const sanitizeAnonymousEvidence = (evidenceItem: any) => {
  if (!evidenceItem) return evidenceItem;

  const isAnonymous = evidenceItem.isAnonymous === true;

  const sanitized = {
      ...evidenceItem,
      submitter: toPublicAuthorDTO(evidenceItem.submitter, isAnonymous),
  };

  if (isAnonymous) {
      delete sanitized.submittedBy;
  }

  return sanitized;
};

export const sanitizeAnonymousOpinion = (opinionItem: any) => {
    if (!opinionItem) return opinionItem;

    const isAnonymous = opinionItem.isAnonymous === true;

    const sanitized = {
        ...opinionItem,
        author: toPublicAuthorDTO(opinionItem.author, isAnonymous),
    };

    if (isAnonymous) {
        delete sanitized.authorId;
    }

    // Handle nested replies
    if (sanitized.replies && Array.isArray(sanitized.replies)) {
        sanitized.replies = sanitized.replies.map(sanitizeAnonymousOpinion);
    }
    
    // Handle sources
    if (sanitized.sources && Array.isArray(sanitized.sources)) {
        sanitized.sources = sanitized.sources.map((os: any) => {
           if (os.source) {
               return { ...os, source: sanitizeAnonymousSource(os.source) };
           }
           return os;
        });
    }

    return sanitized;
};

export const sanitizeAnonymousSource = (sourceItem: any) => {
    if (!sourceItem) return sourceItem;

    const isAnonymous = sourceItem.isAnonymous === true;

    const sanitized = {
        ...sourceItem,
        creator: toPublicAuthorDTO(sourceItem.creator, isAnonymous),
    };

    if (isAnonymous) {
        delete sanitized.createdBy;
    }

    return sanitized;
};
