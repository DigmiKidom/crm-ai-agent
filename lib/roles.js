// User.role has existed on the schema and been returned by /api/me since the
// start, but nothing ever branched on it — every authenticated tenant member
// could hit every tenant-level route regardless of role. This is what makes
// the field mean something: a minimum-role check for the routes that change
// the tenant's own configuration (company profile, landing-page copy,
// pipeline stages, AI regeneration, team management), while day-to-day CRM
// work (leads, contacts, the CV builder) stays open to every role.

export const ROLES = ["owner", "admin", "member"];

// An owner is created exactly once, at signup — there's no flow that hands
// out ownership, so it isn't offered as an invite role.
export const INVITABLE_ROLES = ["admin", "member"];

const ROLE_RANK = { owner: 3, admin: 2, member: 1 };

/** True if `role` meets or exceeds `minimum` in privilege. Unknown roles rank 0. */
export function hasRole(role, minimum) {
  return (ROLE_RANK[role] || 0) >= (ROLE_RANK[minimum] || Infinity);
}
