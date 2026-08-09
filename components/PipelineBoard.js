"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconSearch, IconClose, IconCheck } from "@/components/icons";
import LeadWhatsAppLink from "@/components/LeadWhatsAppLink";
import DealClosureModal from "@/components/DealClosureModal";
import { classifyStages } from "@/lib/stageClassifier";
import { shouldPromptForClosure } from "@/lib/dealClosure";
import styles from "./dashboard.module.css";

export default function PipelineBoard({
  initialLeads,
  stages,
  tenantSlug,
  // Both only used to compose the one-click WhatsApp message on each card.
  whatsappTemplate = "",
  companyName = "",
  currency = "USD",
}) {
  const t = useT();
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [query, setQuery] = useState("");
  // Set when a move lands in a won/lost column and needs a resolution
  // summary before it's saved.
  const [closing, setClosing] = useState(null);

  // The tenant's own stage names, classified the same way the server and
  // Analytics classify them.
  const outcomes = useMemo(() => classifyStages(stages), [stages]);
  function outcomeFor(stage) {
    if (outcomes.won.has(stage)) return "won";
    if (outcomes.lost.has(stage)) return "lost";
    return "open";
  }

  // Client-side, not a server round trip: the board already has every lead
  // in memory (it has to, for drag-and-drop), so filtering a few hundred
  // cards locally is instant where a fetch-per-keystroke wouldn't be.
  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)
    );
  }, [leads, query]);

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

    // Dropping a card into a won or lost column opens the resolution modal
    // rather than saving straight away — the modal does the save, stage
    // included. The card still moves optimistically, so the drag feels
    // finished; cancelling puts it back.
    const outcome = outcomeFor(stage);
    if (
      shouldPromptForClosure({
        fromStatus: outcomeFor(previousStage),
        toStatus: outcome,
        hasClosure: Boolean(lead.closure?.closedAt),
      })
    ) {
      setLeads((current) => current.map((l) => (l._id === leadId ? { ...l, stage } : l)));
      setClosing({ lead, stage, previousStage, outcome });
      return;
    }

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
    <div>
      <div className={styles.pipelineSearchRow}>
        <div className={styles.pipelineSearchInput}>
          <IconSearch size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pipeline.searchPlaceholder")}
            aria-label={t("pipeline.searchPlaceholder")}
          />
        </div>
        {query && (
          <button type="button" className={styles.linkButton} onClick={() => setQuery("")}>
            <IconClose size={13} />
            {t("leads.clearFilters")}
          </button>
        )}
      </div>

      <div className={styles.pipelineBoard}>
        {stages.map((stage) => {
          const stageLeads = visibleLeads.filter((l) => l.stage === stage);
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
              {stageLeads.length === 0 && query ? (
                <p className={styles.empty}>{t("pipeline.noMatch")}</p>
              ) : (
                stageLeads.map((lead) => (
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
                      <strong>
                        {lead.name}
                        {lead.dealStatus === "won" && (
                          <span className={styles.wonBadge} title={t("leads.dealStatus.won")}>
                            <IconCheck size={11} />
                          </span>
                        )}
                      </strong>
                      <div>{lead.email}</div>
                      {lead.needsFollowUp && (
                        <span className={styles.followUpBadge}>{t("leads.pendingFollowUp")}</span>
                      )}
                    </a>
                    <div className={styles.pipelineCardActions}>
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

                      <LeadWhatsAppLink
                        lead={lead}
                        template={whatsappTemplate}
                        companyName={companyName}
                        label={t("leads.whatsapp", { name: lead.name })}
                        size={15}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {closing && (
        <DealClosureModal
          lead={closing.lead}
          outcome={closing.outcome}
          stage={closing.stage}
          currency={currency}
          onCancel={() => {
            // Put the card back where it came from — a dialog someone
            // dismissed shouldn't have moved anything.
            setLeads((current) =>
              current.map((l) => (l._id === closing.lead._id ? { ...l, stage: closing.previousStage } : l))
            );
            setClosing(null);
          }}
          onSaved={(saved) => {
            setLeads((current) =>
              current.map((l) =>
                l._id === closing.lead._id
                  ? { ...l, stage: closing.stage, dealStatus: saved?.dealStatus || l.dealStatus }
                  : l
              )
            );
            setClosing(null);
          }}
        />
      )}
    </div>
  );
}
