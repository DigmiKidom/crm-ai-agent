// Won/lost inference for a tenant's own free-text pipeline stages, split out
// of lib/analytics.js so it can be imported from a client component
// (LeadDetailEditor's inline "you're marking this won" nudge) without also
// pulling in analytics.js's top-level Mongoose model imports — those drag
// the Node-only MongoDB driver into the browser bundle even when the only
// thing actually used is this pure string classifier. Model-free, same
// pattern as lib/pipelineDefaults.js and lib/meetingConstants.js.
//
// Pipeline stages are AI-generated per tenant, so we can't hardcode "won" and
// "lost" — we pattern-match the tenant's own stage names, then fall back to
// position (the last stage in a pipeline is conventionally the winning one).
const WON_RE = /\b(won|win|closed[\s-]?won|customer|client|signed|sold|paid|converted|booked|deal)\b/i;
const LOST_RE = /\b(lost|closed[\s-]?lost|dead|rejected|declined|unqualified|disqualified|churned|cancell?ed|archived)\b/i;

export function classifyStages(stages) {
  const lost = stages.filter((s) => LOST_RE.test(s));
  let won = stages.filter((s) => WON_RE.test(s) && !LOST_RE.test(s));

  // No name matched, so assume the final stage is the successful outcome —
  // unless the final stage is itself a losing one.
  if (won.length === 0) {
    const last = stages[stages.length - 1];
    if (last && !LOST_RE.test(last)) won = [last];
  }

  const wonSet = new Set(won);
  const lostSet = new Set(lost);

  return {
    won: wonSet,
    lost: lostSet,
    // Everything that is neither a win nor a loss is still in play.
    isOpen: (stage) => !wonSet.has(stage) && !lostSet.has(stage),
  };
}
