"use client";

import { useState } from "react";
import styles from "@/components/dashboard.module.css";

export default function StageSelect({ leadId, stage, stages }) {
  const [value, setValue] = useState(stage);
  const [saving, setSaving] = useState(false);

  async function handleChange(e) {
    const newStage = e.target.value;
    setValue(newStage);
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setSaving(false);
  }

  return (
    <select className={styles.stageSelect} value={value} onChange={handleChange} disabled={saving}>
      {stages.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
