"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./dashboard.module.css";

export default function PipelineBoard({ initialLeads, stages, tenantSlug }) {
  const t = useT();
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  function handleDragStart(leadId) {
    setDraggingId(leadId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }

  // Shared by both drag-and-drop and the keyboard-accessible stage <select>
  // on each card (see below) — native HTML5 drag-and-drop has no keyboard
  // equivalent at all, so the select is the only way a keyboard-only user
  // can move a lead between stages from this board.
  async function moveLead(leadId, stage) {
    const lead = leads.find((l) => l._id === leadId);
    if (!lead || lead.stage === stage) return;

    const previousStage = lead.stage;

    // Optimistic update — move the card immediately, roll back if the
    // save fails.
    setLeads((current) => current.map((l) => (l._id === leadId ? { ...l, stage } : l)));

    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });

    if (!res.ok) {
      setLeads((current) =>
        current.map((l) => (l._id === leadId ? { ...l, stage: previousStage } : l))
      );
    }
  }

  function handleDrop(stage) {
    setDragOverStage(null);
    if (!draggingId) return;
    const leadId = draggingId;
    setDraggingId(null);
    moveLead(leadId, stage);
  }

  return (
    <div className={styles.pipelineBoard}>
      {stages.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage);
        const isOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className={`${styles.pipelineColumn} ${isOver ? styles.pipelineColumnOver : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage((current) => (current === stage ? null : current))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(stage);
            }}
          >
            <h3>
              {stage} ({stageLeads.length})
            </h3>
            {stageLeads.map((lead) => (
              <div
                key={lead._id}
                draggable
                onDragStart={() => handleDragStart(lead._id)}
                onDragEnd={handleDragEnd}
                className={`${styles.pipelineCard} ${
                  draggingId === lead._id ? styles.pipelineCardDragging : ""
                }`}
              >
                <a
                  href={`/t/${tenantSlug}/leads/${lead._id}`}
                  className={styles.pipelineCardLink}
                >
                  <strong>{lead.name}</strong>
                  <div>{lead.email}</div>
                </a>
                {/* Keyboard/screen-reader path for what dragging does for a
                    mouse user — stages a <select> rather than requiring a
                    full keyboard drag-and-drop implementation. */}
                <select
                  className={styles.pipelineCardMoveSelect}
                  aria-label={t("pipeline.moveToStage", { name: lead.name })}
                  value={lead.stage}
                  onChange={(e) => moveLead(lead._id, e.target.value)}
                >
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
