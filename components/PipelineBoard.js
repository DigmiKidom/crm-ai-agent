"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

export default function PipelineBoard({ initialLeads, stages, tenantSlug }) {
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

  async function handleDrop(stage) {
    setDragOverStage(null);
    if (!draggingId) return;

    const lead = leads.find((l) => l._id === draggingId);
    if (!lead || lead.stage === stage) {
      setDraggingId(null);
      return;
    }

    const previousStage = lead.stage;

    // Optimistic update — move the card immediately, roll back if the
    // save fails.
    setLeads((current) =>
      current.map((l) => (l._id === draggingId ? { ...l, stage } : l))
    );
    setDraggingId(null);

    const res = await fetch(`/api/leads/${draggingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });

    if (!res.ok) {
      setLeads((current) =>
        current.map((l) => (l._id === draggingId ? { ...l, stage: previousStage } : l))
      );
    }
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
              <a
                key={lead._id}
                href={`/t/${tenantSlug}/leads/${lead._id}`}
                draggable
                onDragStart={() => handleDragStart(lead._id)}
                onDragEnd={handleDragEnd}
                className={`${styles.pipelineCard} ${
                  draggingId === lead._id ? styles.pipelineCardDragging : ""
                }`}
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <strong>{lead.name}</strong>
                <div>{lead.email}</div>
              </a>
            ))}
          </div>
        );
      })}
    </div>
  );
}
