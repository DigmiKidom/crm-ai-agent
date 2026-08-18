// The plugin registry. Its job is to survive a stored array that no longer
// matches the code — that is the only way this can break in production.
import assert from "node:assert/strict";
import {
  PLUGINS,
  PLUGIN_IDS,
  enabledPluginList,
  getPlugin,
  isPluginEnabled,
  normalizeEnabledPlugins,
} from "../lib/plugins.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

console.log("\n— plugin registry —");

check("every plugin is complete and uniquely identified", () => {
  assert.equal(new Set(PLUGIN_IDS).size, PLUGINS.length);
  for (const plugin of PLUGINS) {
    for (const field of ["id", "path", "icon", "labelKey", "descKey", "order"]) {
      assert.ok(plugin[field] !== undefined, `${plugin.id}.${field}`);
    }
    assert.ok(plugin.path.startsWith("/"), plugin.id);
  }
});

check("paths are distinct and don't collide with core dashboard routes", () => {
  const paths = PLUGINS.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  const core = ["/leads", "/calendar", "/contacts", "/settings", "/pipeline", "/analytics", "/site", "/cv", "/hub", "/profile", "/onboarding", "/closed-deals", "/tutorial", "/w"];
  for (const path of paths) assert.ok(!core.includes(path), path);
});

check("a missing field means nothing is enabled", () => {
  // Every user who predates this feature has no enabledPlugins at all.
  for (const value of [undefined, null, "tasks", 42, {}]) {
    assert.deepEqual(normalizeEnabledPlugins(value), []);
  }
});

check("ids that are no longer in the registry are dropped", () => {
  assert.deepEqual(normalizeEnabledPlugins(["tasks", "a-tool-we-removed"]), ["tasks"]);
});

check("order follows the registry, not the stored array", () => {
  // Otherwise the sidebar would be ordered by whichever toggle was clicked
  // first, which differs per user for no reason anyone chose.
  const reversed = [...PLUGIN_IDS].reverse();
  assert.deepEqual(normalizeEnabledPlugins(reversed), PLUGIN_IDS);
});

check("duplicates collapse", () => {
  assert.deepEqual(normalizeEnabledPlugins(["notes", "notes", "notes"]), ["notes"]);
});

check("enabledPluginList returns registry entries sorted by order", () => {
  const list = enabledPluginList(["surveys", "tasks"]);
  assert.deepEqual(list.map((p) => p.id), ["tasks", "surveys"]);
  assert.ok(list[0].labelKey.startsWith("plugins."));
});

check("lookup helpers agree with the registry", () => {
  assert.equal(getPlugin("tasks").path, "/tasks");
  assert.equal(getPlugin("nope"), null);
  assert.equal(isPluginEnabled(["tasks"], "tasks"), true);
  assert.equal(isPluginEnabled(["tasks"], "notes"), false);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
