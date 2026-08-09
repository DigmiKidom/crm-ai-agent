// The stage list a brand-new tenant starts with, before AI Setup generates
// industry-specific ones (see app/api/agent/generate/route.js) or the tenant
// edits them by hand (PipelineStagesEditor). Previously duplicated as an
// inline literal in four places (Pipeline's own schema default, lib/analytics.js,
// and both the leads list and pipeline board pages) — a single source of
// truth here is what keeps a future change to the defaults from silently
// drifting between them.
export const DEFAULT_PIPELINE_STAGES = ["new", "contacted", "qualified", "won", "lost"];
