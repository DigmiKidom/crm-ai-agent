// Unit coverage for the "by construction" guarantee tenantScoped() exists to
// provide: every call it makes against the wrapped model must carry the
// tenantId, even if the caller's own filter tries to override it.
import { tenantScoped } from "../lib/tenantScope.js";

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log("  ok   " + name);
    pass++;
  } catch (e) {
    console.log("  FAIL " + name + "\n        " + e.message);
    failures.push(name);
  }
}

function fakeModel() {
  const calls = [];
  const record = (method) => (...args) => {
    calls.push({ method, args });
    return { chained: true };
  };
  return {
    calls,
    find: record("find"),
    findOne: record("findOne"),
    findOneAndUpdate: record("findOneAndUpdate"),
    findOneAndDelete: record("findOneAndDelete"),
    countDocuments: record("countDocuments"),
    exists: record("exists"),
    create: record("create"),
    updateOne: record("updateOne"),
    updateMany: record("updateMany"),
    deleteMany: record("deleteMany"),
  };
}

check("throws without a tenantId, rather than silently scoping to undefined", () => {
  let threw = false;
  try {
    tenantScoped(fakeModel(), undefined);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected tenantScoped() to throw with no tenantId");
});

check("find() injects tenantId into an empty filter", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").find();
  if (model.calls[0].args[0].tenantId !== "tenant-1") throw new Error("tenantId missing");
});

check("findOne() merges tenantId alongside caller filters", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").findOne({ email: "a@b.com" });
  const arg = model.calls[0].args[0];
  if (arg.email !== "a@b.com" || arg.tenantId !== "tenant-1") {
    throw new Error("expected both caller filter and tenantId: " + JSON.stringify(arg));
  }
});

check("findById() scopes by _id and tenantId, not _id alone", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").findById("lead-9");
  const arg = model.calls[0].args[0];
  if (arg._id !== "lead-9" || arg.tenantId !== "tenant-1") {
    throw new Error("expected _id + tenantId scoping: " + JSON.stringify(arg));
  }
});

check("a caller-supplied tenantId in the filter cannot override the real one", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").find({ tenantId: "someone-elses-tenant" });
  if (model.calls[0].args[0].tenantId !== "tenant-1") {
    throw new Error("caller filter was able to override the scoped tenantId");
  }
});

check("create() stamps tenantId onto the new document", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").create({ name: "Ada" });
  const arg = model.calls[0].args[0];
  if (arg.name !== "Ada" || arg.tenantId !== "tenant-1") {
    throw new Error("expected doc + tenantId: " + JSON.stringify(arg));
  }
});

check("findOneAndUpdate() and findOneAndDelete() both scope their filter", () => {
  const model = fakeModel();
  const scoped = tenantScoped(model, "tenant-1");
  scoped.findOneAndUpdate({ _id: "x" }, { name: "New" });
  scoped.findOneAndDelete({ _id: "y" });
  if (model.calls[0].args[0].tenantId !== "tenant-1") throw new Error("update not scoped");
  if (model.calls[1].args[0].tenantId !== "tenant-1") throw new Error("delete not scoped");
});

check("updateOne(), updateMany(), and deleteMany() all scope their filter", () => {
  const model = fakeModel();
  const scoped = tenantScoped(model, "tenant-1");
  scoped.updateOne({ _id: "a" }, { $set: { x: 1 } });
  scoped.updateMany({ stage: "new" }, { $set: { stage: "won" } });
  scoped.deleteMany({ itemId: "b" });
  if (model.calls[0].args[0].tenantId !== "tenant-1") throw new Error("updateOne not scoped");
  if (model.calls[1].args[0].tenantId !== "tenant-1") throw new Error("updateMany not scoped");
  if (model.calls[2].args[0].tenantId !== "tenant-1") throw new Error("deleteMany not scoped");
});

check("exists() scopes its filter", () => {
  const model = fakeModel();
  tenantScoped(model, "tenant-1").exists({ _id: "logo-1" });
  if (model.calls[0].args[0].tenantId !== "tenant-1") throw new Error("exists not scoped");
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
