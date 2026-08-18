"use client";

import { useCallback, useMemo, useState } from "react";
import { LEDGER_TYPES, monthlySummaries, summarize } from "@/lib/ledger";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { IconPlus, IconTrash, IconTrendDown, IconTrendUp } from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function LedgerView({ initialEntries = [], currency = "ILS" }) {
  const t = useT();
  const { locale } = useLocale();

  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({
    date: todayInput(),
    description: "",
    type: "income",
    amount: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Totals are recomputed from the rows on screen rather than trusted from the
  // last response, so an optimistic add or delete moves the summary in the same
  // frame as the row. lib/ledger.js is the single implementation, shared with
  // the API and unit-tested — the numbers here can't drift from the server's.
  const summary = useMemo(() => summarize(entries), [entries]);
  const months = useMemo(() => monthlySummaries(entries), [entries]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "ILS",
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  );

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale]
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }),
    [locale]
  );

  const request = useCallback(
    async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("finances.saveFailed"));
      return data;
    },
    [t]
  );

  async function addEntry(event) {
    event.preventDefault();
    if (busy) return;

    // Accepts a comma as the decimal separator, which is what a Hebrew or
    // Spanish keyboard produces and what most people type anyway.
    const amount = Number(String(form.amount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("finances.invalidAmount"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await request("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      setEntries((current) => [data.entry, ...current]);
      setForm((current) => ({ ...current, description: "", amount: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entry) {
    const previous = entries;
    setEntries((current) => current.filter((row) => row._id !== entry._id));
    setError("");
    try {
      await request(`/api/ledger/${entry._id}`, { method: "DELETE" });
    } catch (err) {
      setEntries(previous);
      setError(err.message);
    }
  }

  return (
    <div className={styles.toolPage}>
      <div className={dash.statGrid}>
        <div className={dash.statCard}>
          <span className={dash.statIcon}>
            <IconTrendUp size={17} />
          </span>
          <span className={dash.statValue}>{money.format(summary.income)}</span>
          <span className={dash.statLabel}>{t("finances.income")}</span>
        </div>
        <div className={dash.statCard}>
          <span className={dash.statIcon}>
            <IconTrendDown size={17} />
          </span>
          <span className={dash.statValue}>{money.format(summary.expense)}</span>
          <span className={dash.statLabel}>{t("finances.expense")}</span>
        </div>
        <div className={dash.statCard} data-net={summary.net >= 0 ? "positive" : "negative"}>
          <span className={dash.statValue}>{money.format(summary.net)}</span>
          <span className={dash.statLabel}>{t("finances.net")}</span>
        </div>
      </div>

      <form className={styles.composer} onSubmit={addEntry}>
        <input
          type="date"
          dir="ltr"
          className={styles.composerDate}
          value={form.date}
          onChange={(event) => setForm({ ...form, date: event.target.value })}
          aria-label={t("finances.date")}
        />
        <input
          className={styles.composerInput}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder={t("finances.descriptionPlaceholder")}
          aria-label={t("finances.description")}
          maxLength={200}
        />
        <select
          className={styles.composerSelect}
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
          aria-label={t("finances.type")}
        >
          {LEDGER_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`finances.${value}`)}
            </option>
          ))}
        </select>
        {/*
          inputMode="decimal" rather than type="number": a number input in a
          right-to-left page renders its spinner on whichever side the browser
          feels like, and silently discards a value typed with a comma.
        */}
        <input
          dir="ltr"
          inputMode="decimal"
          className={styles.composerAmount}
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
          placeholder={t("finances.amount")}
          aria-label={t("finances.amount")}
        />
        <button type="submit" className={dash.saveButton} disabled={busy}>
          <IconPlus size={15} />
          {t("finances.add")}
        </button>
      </form>

      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      {months.length > 1 && (
        <div className={styles.monthStrip}>
          {months.map((month) => (
            <div key={month.month} className={styles.monthCard}>
              <span className={styles.monthLabel}>
                {monthFormatter.format(new Date(`${month.month}-01T00:00:00.000Z`))}
              </span>
              <span className={styles.monthNet} data-negative={month.net < 0}>
                {money.format(month.net)}
              </span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className={dash.empty}>{t("finances.empty")}</p>
      ) : (
        <table className={dash.table}>
          <thead>
            <tr>
              <th>{t("finances.date")}</th>
              <th>{t("finances.description")}</th>
              <th>{t("finances.type")}</th>
              <th>{t("finances.amount")}</th>
              <th aria-label={t("common.delete")} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td>{dateFormatter.format(new Date(entry.date))}</td>
                <td>{entry.description || "—"}</td>
                <td>
                  <span className={styles.typeTag} data-type={entry.type}>
                    {t(`finances.${entry.type}`)}
                  </span>
                </td>
                <td className={styles.amountCell} data-type={entry.type}>
                  {entry.type === "expense" ? "−" : "+"}
                  {money.format(entry.amount)}
                </td>
                <td>
                  <button
                    type="button"
                    className={dash.iconButton}
                    onClick={() => removeEntry(entry)}
                    aria-label={`${t("common.delete")}: ${entry.description || entry.amount}`}
                    title={t("common.delete")}
                  >
                    <IconTrash size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
