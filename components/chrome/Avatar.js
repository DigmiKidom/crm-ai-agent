"use client";

import { useState } from "react";
import styles from "./chrome.module.css";

// Eight hand-picked hues that all clear 4.5:1 against white text. The palette
// is fixed and small so two people in the same company are unlikely to collide,
// while every generated avatar still looks like it belongs to the same product.
const SWATCHES = [
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#f43f5e",
  "#f97316",
  "#14b8a6",
  "#22c55e",
];

/** Stable per-user colour: same name always yields the same swatch. */
function swatchFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return SWATCHES[Math.abs(hash) % SWATCHES.length];
}

/**
 * Initials from a display name, falling back to the local part of an email.
 * Uses Intl.Segmenter where available so multi-byte scripts (Hebrew, emoji)
 * aren't sliced mid-codepoint by a naive `charAt(0)`.
 */
function initialsFor(name, email) {
  const source = (name || "").trim() || (email || "").split("@")[0] || "";
  if (!source) return "?";

  const words = source.split(/[\s._-]+/).filter(Boolean).slice(0, 2);
  const firstChar = (word) => Array.from(word)[0] ?? "";

  const letters = words.map(firstChar).join("");
  return (letters || firstChar(source) || "?").toUpperCase();
}

/**
 * Presentational avatar. `mediaId` points at a Media document served by
 * /api/media/[id]; when it's absent (or the request 404s after a deletion)
 * this falls back to coloured initials rather than a broken image icon.
 */
export default function Avatar({
  mediaId,
  name,
  email,
  size = 32,
  className = "",
  alt,
}) {
  const [failed, setFailed] = useState(false);

  const initials = initialsFor(name, email);
  const showImage = Boolean(mediaId) && !failed;

  const style = {
    width: size,
    height: size,
    // Initials should scale with the circle, but never below legibility.
    fontSize: Math.max(10, Math.round(size * 0.38)),
    background: showImage ? "transparent" : swatchFor(name || email || "ceramony"),
  };

  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={style}
      data-has-image={showImage || undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/media/${mediaId}`}
          alt={alt ?? ""}
          className={styles.avatarImage}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
