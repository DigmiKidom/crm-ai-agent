"use client";

import { useRef, useState } from "react";
import { IconClose, IconPlus } from "./icons";
import styles from "./dashboard.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// Compression happens in the browser, before upload. This is deliberate:
// it keeps Mongo storing 30–250KB blobs instead of 5MB phone photos, moves the
// CPU cost onto the client instead of the server, and means a slow connection
// uploads a small file rather than a huge one.
const PRESETS = {
  logo: { maxW: 512, maxH: 512, quality: 0.9 },
  background: { maxW: 1920, maxH: 1080, quality: 0.82 },
  gallery: { maxW: 1400, maxH: 1400, quality: 0.82 },
  // Avatars never render above 96px, so 256 covers a 2x display with room to
  // spare and keeps the stored blob around 15-25KB.
  avatar: { maxW: 256, maxH: 256, quality: 0.88 },
};

// Rejects with a translation KEY, not a message: this runs at module scope,
// outside any component, so it has no translator. The caller — which is inside
// the component — turns the key into text.
function compress(file, { maxW, maxH, quality }) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down to fit the box, never up — upscaling only adds bytes.
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // WebP is 25–35% smaller than JPEG at equivalent quality and is
      // supported everywhere that matters; JPEG is the fallback.
      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ blob, width, height });
          else canvas.toBlob((jpg) => (jpg ? resolve({ blob: jpg, width, height }) : reject(new Error("upload.processFailed"))), "image/jpeg", quality);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("upload.notAnImage"));
    };

    img.src = url;
  });
}

/**
 * Single-image picker. `value` is a media id (or null); `onChange` receives the
 * new media id, or null when cleared.
 */
export default function ImageUpload({
  value,
  onChange,
  kind = "logo",
  label,
  hint,
  previewClassName,
}) {
  const t = useT();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after a remove
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("upload.chooseImageFile"));
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { blob, width, height } = await compress(file, PRESETS[kind] ?? PRESETS.logo);

      const body = new FormData();
      body.append("file", blob, "upload.webp");
      body.append("kind", kind);
      body.append("width", String(width));
      body.append("height", String(height));

      const res = await fetch("/api/media", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || t("upload.uploadFailed"));
      onChange(data.media.id);
    } catch (err) {
      // compress() rejects with a translation key (it has no translator in
      // scope); everything else rejects with a ready-made message. t() falls
      // back to returning the input unchanged when it isn't a known key, so
      // one call handles both.
      setError(err.message ? t(err.message) : t("upload.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.imageUpload}>
      {label && <label className={styles.imageUploadLabel}>{label}</label>}

      {value ? (
        <div className={styles.imagePreviewWrap}>
          {/* Plain <img>: the source is our own API route, and next/image
              would only add an optimization hop for an already-optimized blob. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${value}`}
            alt=""
            className={`${styles.imagePreview} ${previewClassName || ""}`}
          />
          <div className={styles.imagePreviewActions}>
            <button
              type="button"
              className={`${styles.linkButton} ${styles.iconLabel}`}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </button>
            <button
              type="button"
              className={`${styles.linkButton} ${styles.iconLabel}`}
              style={{ color: "var(--danger-strong)" }}
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <IconClose size={13} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.imageDropzone}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <IconPlus size={18} />
          <span>{busy ? t("upload.optimizing") : t("upload.chooseImage")}</span>
          {hint && <em className={styles.imageHint}>{hint}</em>}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {error && <p className={styles.imageError}>{error}</p>}
    </div>
  );
}
