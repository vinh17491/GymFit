export const moderationStatuses=['DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','SUSPENDED'] as const;
export type ModerationStatus=(typeof moderationStatuses)[number];
export type ModerationAction='approve'|'reject'|'suspend'|'republish';
export type ModerationQuery={
  page:number;limit:number;search?:string;shopId?:number;status:ModerationStatus;categoryId?:number;brandId?:number;
  submittedFrom?:Date;submittedTo?:Date;sortBy:'submittedAt'|'createdAt'|'reviewedAt';sortOrder:'asc'|'desc';
};
export type ReadinessResult={ready:boolean;missing:string[]};
