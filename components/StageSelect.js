"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DealClosureModal from "./DealClosureModal";
import { classifyStages } from "@/lib/stageClassifier";
import { shouldPromptForClosure } from "@/lib/dealClosure";
import styles from "@/components/dashboard.module.css";

/**
 * The per-row stage picker in the leads table.
 *
 * Moving a lead into a won or lost stage opens the resolution modal instead
 * of saving immediately — the modal performs the save, stage included, so
 * there's exactly one write and no window where a deal is closed with no
 * record of how. Cancelling the modal puts the select back where it was,
 * because a dialog someone dismissed should not have changed anything.
 *
 * The won/lost classification is the same one the server uses (and Analytics
 * uses) against the tenant's own stage names — see lib/stageClassifier.js.
 */
export default function StageSelect({ leadId, lead, stage, stages, currency = "USD" }) {
  const router = useRouter();
  const [value, setValue] = useState(stage);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null); // { stage, outcome }

  const { won, lost } = classifyStages(stages);

  function outcomeFor(next) {
    if (won.has(next)) return "won";
    if (lost.has(next)) return "lost";
    return "open";
  }

  async function handleChange(e) {
    const newStage = e.target.value;
    const previous = value;
    const outcome = outcomeFor(newStage);

    setValue(newStage);

    if (
      shouldPromptForClosure({
        fromStatus: outcomeFor(previous),
        toStatus: outcome,
        hasClosure: Boolean(lead?.closure?.closedAt),
      })
    ) {
      setPending({ stage: newStage, previous, outcome });
      return;
    }

    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <select
        className={styles.stageSelect}
        value={value}
        onChange={handleChange}
        disabled={saving || Boolean(pending)}
      >
        {stages.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {pending && (
        <DealClosureModal
          lead={{ _id: leadId, name: lead?.name || "", dealValue: lead?.dealValue || 0 }}
          outcome={pending.outcome}
          stage={pending.stage}
          currency={currency}
          onCancel={() => {
            setValue(pending.previous);
            setPending(null);
          }}
          onSaved={() => {
            setPending(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
