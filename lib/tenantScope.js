// Deliberately framework-free (no next/server, no auth.js, no Mongoose model
// imports) so it can be unit-tested by plain Node, the same way lib/analytics.js
// and lib/formFields.js are — see test/tenantScope.test.mjs. The auth+DB
// glue that routes actually call lives in lib/tenantSession.js, which is
// Next-runtime-only and composes this.

/**
 * Wraps a Mongoose model so every query/write below carries `tenantId` by
 * construction — the call site can no longer forget the filter, which is the
 * failure mode a manual `{ ...filter, tenantId: session.user.tenantId }` on
 * every call site invites the moment someone's in a hurry.
 *
 * Each method returns the real Mongoose Query/Document, so normal chaining
 * (`.select()`, `.sort()`, `.lean()`, ...) still works exactly as before.
 */
export function tenantScoped(Model, tenantId) {
  if (!tenantId) throw new Error("tenantScoped() requires a tenantId");

  return {
    find: (filter = {}, ...rest) => Model.find({ ...filter, tenantId }, ...rest),
    findOne: (filter = {}, ...rest) => Model.findOne({ ...filter, tenantId }, ...rest),
    findById: (id, ...rest) => Model.findOne({ _id: id, tenantId }, ...rest),
    findOneAndUpdate: (filter, update, opts) =>
      Model.findOneAndUpdate({ ...filter, tenantId }, update, opts),
    findOneAndDelete: (filter, opts) => Model.findOneAndDelete({ ...filter, tenantId }, opts),
    countDocuments: (filter = {}) => Model.countDocuments({ ...filter, tenantId }),
    exists: (filter = {}) => Model.exists({ ...filter, tenantId }),
    create: (doc) => Model.create({ ...doc, tenantId }),
    updateOne: (filter, update, opts) => Model.updateOne({ ...filter, tenantId }, update, opts),
    updateMany: (filter, update, opts) => Model.updateMany({ ...filter, tenantId }, update, opts),
    deleteMany: (filter = {}, opts) => Model.deleteMany({ ...filter, tenantId }, opts),
  };
}
