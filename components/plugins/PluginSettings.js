"use client";

import { useCallback, useState } from "react";
import { PLUGINS, normalizeEnabledPlugins } from "@/lib/plugins";
import { pluginIcon } from "./pluginIcons";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconCheck, IconLock } from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

/**
 * The tools screen: one card per optional tool, with a switch.
 *
 * Optimistic. A toggle is a preference, not a transaction — waiting on a round
 * trip to move a switch makes the whole screen feel broken on a slow
 * connection, and the cost of being wrong is that a row appears in the sidebar
 * for a second before going away again. On failure the switch snaps back and
 * says why.
 *
 * The whole selection is sent on every change rather than a single {id, on}.
 * Two switches flipped in quick succession would otherwise race on one field,
 * and the loser would be silently discarded — see the note in
 * app/api/me/plugins/route.js.
 */
export default function PluginSettings({ initialEnabled = [], coreLabels = [] }) {
  const t = useT();
  const [enabled, setEnabled] = useState(() => normalizeEnabledPlugins(initialEnabled));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);

  const save = useCallback(
    async (next, id) => {
      const previous = enabled;
      setEnabled(next);
      setError("");
      setPending(id);

      try {
        const res = await fetch("/api/me/plugins", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabledPlugins: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t("plugins.saveFailed"));

        // The server's normalised order is authoritative, so the sidebar and
        // this screen agree on more than just the set.
        setEnabled(normalizeEnabledPlugins(data.enabledPlugins));

        // The sidebar is rendered by a server layout, so it only picks up the
        // change on a refresh. router.refresh() would do it without a reload,
        // but the nav lives above this route segment and a full reload is both
        // simpler and instant enough for something clicked a handful of times.
        window.location.reload();
      } catch (err) {
        setEnabled(previous);
        setError(err.message);
        setPending(null);
      }
    },
    [enabled, t]
  );

  function toggle(id) {
    const next = enabled.includes(id)
      ? enabled.filter((p) => p !== id)
      : [...enabled, id];
    save(next, id);
  }

  return (
    <div className={styles.toolsPage}>
      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.toolGrid}>
        {PLUGINS.map((plugin) => {
          const Icon = pluginIcon(plugin.icon);
          const on = enabled.includes(plugin.id);
          const busy = pending === plugin.id;

          return (
            <div key={plugin.id} className={styles.toolCard} data-on={on}>
              <span className={styles.toolIcon} aria-hidden="true">
                <Icon size={20} />
              </span>

              <div className={styles.toolText}>
                <h3 className={styles.toolTitle}>{t(plugin.labelKey)}</h3>
                <p className={styles.toolDescription}>{t(plugin.descKey)}</p>
              </div>

              {/*
                A real checkbox rather than a div with a click handler: it is
                reachable by keyboard, announced as a switch, and reports its
                own state without any aria bookkeeping. The visual switch is the
                sibling span, driven entirely by :checked.
              */}
              <label className={styles.switch}>
                <span className={styles.switchLabel}>
                  {on ? t("plugins.on") : t("plugins.off")}
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.switchInput}
                  checked={on}
                  disabled={busy}
                  onChange={() => toggle(plugin.id)}
                  aria-label={`${t(plugin.labelKey)} — ${on ? t("plugins.on") : t("plugins.off")}`}
                />
                <span className={styles.switchTrack} aria-hidden="true">
                  <span className={styles.switchThumb} />
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {/*
        The permanent rows, shown greyed rather than hidden. Someone looking for
        "why can't I turn off Leads" should find the answer on this screen
        instead of concluding the toggle is missing.
      */}
      <section className={styles.coreSection}>
        <h2 className={dash.sectionTitle}>{t("plugins.coreTitle")}</h2>
        <p className={dash.sectionHint}>{t("plugins.coreHint")}</p>
        <ul className={styles.coreList}>
          {coreLabels.map((label) => (
            <li key={label} className={styles.coreItem}>
              <IconLock size={13} aria-hidden="true" />
              <span>{label}</span>
              <IconCheck size={14} className={styles.coreCheck} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
