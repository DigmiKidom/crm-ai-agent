// The optional-tools registry.
//
// One entry per tool a tenant can switch on from Settings → Tools & plugins.
// Everything else — the sidebar rows, the toggle cards, the route guard that
// 404s a disabled tool, the i18n keys — is derived from this list, so adding a
// sixth tool means adding an object here plus its dictionary keys, and nothing
// else has to be kept in sync by hand.
//
// Framework-free on purpose (no React, no next/*, no mongoose): the proxy runs
// on the Edge, the route guards run on the server, the sidebar runs in the
// browser, and test/plugins.test.mjs runs in bare Node. All four import this.
// Icons are looked up by name in components/plugins/pluginIcons.js instead of
// being imported here, which is what keeps that true.

/**
 * Core navigation — permanently on, never listed as a toggle.
 *
 * Kept here rather than only in DashboardNav so that "is this route optional?"
 * has one answer. A route that isn't in PLUGINS is core by definition; this
 * list exists to be *shown* to the user on the tools screen, so they can see
 * what they can't turn off rather than wondering why it isn't listed.
 */
export const CORE_NAV_KEYS = [
  "overview",
  "hub",
  "leads",
  "calendar",
  "analytics",
  "pipeline",
  "closedDeals",
  "contacts",
  "site",
  "cv",
  "aiSetup",
  "profile",
  "settings",
];

/**
 * `id`       stable identifier, stored in User.enabledPlugins — never rename
 * `path`     appended to /t/<slug>, locale-free (the Link wrapper prefixes it)
 * `icon`     key into components/plugins/pluginIcons.js
 * `labelKey` sidebar row and card title
 * `descKey`  one-line explanation on the tools screen
 * `order`    position among the plugin rows in the sidebar
 */
export const PLUGINS = [
  {
    id: "tasks",
    path: "/tasks",
    icon: "checkSquare",
    labelKey: "plugins.tasks.label",
    descKey: "plugins.tasks.description",
    order: 10,
  },
  {
    id: "notes",
    path: "/notes",
    icon: "note",
    labelKey: "plugins.notes.label",
    descKey: "plugins.notes.description",
    order: 20,
  },
  {
    id: "finances",
    path: "/finances",
    icon: "wallet",
    labelKey: "plugins.finances.label",
    descKey: "plugins.finances.description",
    order: 30,
  },
  {
    id: "snippets",
    path: "/snippets",
    icon: "quote",
    labelKey: "plugins.snippets.label",
    descKey: "plugins.snippets.description",
    order: 40,
  },
  {
    id: "surveys",
    path: "/surveys",
    icon: "star",
    labelKey: "plugins.surveys.label",
    descKey: "plugins.surveys.description",
    order: 50,
  },
];

export const PLUGIN_IDS = PLUGINS.map((p) => p.id);

const BY_ID = new Map(PLUGINS.map((p) => [p.id, p]));

export function getPlugin(id) {
  return BY_ID.get(id) ?? null;
}

/**
 * Narrows whatever is on the user document to real, current plugin ids.
 *
 * Defensive on both ends: the field is absent on every user who existed before
 * this feature (so `undefined` has to mean "none enabled", not a crash), and a
 * plugin that gets removed from the registry later would otherwise leave a
 * dangling id in thousands of documents pointing at a route that no longer
 * exists. Order follows the registry, not the stored array, so the sidebar
 * can't be reordered by the sequence someone happened to click toggles in.
 */
export function normalizeEnabledPlugins(value) {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((id) => typeof id === "string"));
  return PLUGINS.filter((p) => wanted.has(p.id)).map((p) => p.id);
}

export function isPluginEnabled(enabled, id) {
  return normalizeEnabledPlugins(enabled).includes(id);
}

/** The registry entries a given user has switched on, in registry order. */
export function enabledPluginList(enabled) {
  const ids = new Set(normalizeEnabledPlugins(enabled));
  return PLUGINS.filter((p) => ids.has(p.id)).sort((a, b) => a.order - b.order);
}
