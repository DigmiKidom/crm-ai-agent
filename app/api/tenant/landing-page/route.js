import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES, MAX_BACKGROUNDS, MAX_GALLERY, GALLERY_COLUMNS } from "@/lib/models/Tenant";
import Media from "@/lib/models/Media";
import { isValidIconKey } from "@/lib/landingIcons";
import { templateIds } from "@/lib/templates";
import { normalizeFormFields, MAX_FORM_FIELDS } from "@/lib/formFields";
import { normalizeSocial, isValidPhone } from "@/lib/socialLinks";
import { normalizeFaq, MAX_FAQ_ITEMS } from "@/lib/faq";
import { catalogMediaIds, normalizeCatalog, MAX_CATALOG_NOTE } from "@/lib/catalog";
import { catalogLimit, galleryLimit } from "@/lib/plan";
import { resolveContentLanguage } from "@/lib/i18n/languages";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const MAX_DESCRIPTION = 300;
const CARD_COLORS = ["primary", "accent"];

// Maps the stable `code` a formFields validation error carries (see
// lib/formFields.js) to a localized message — that module has no request
// context of its own to translate with.
function formFieldsErrorMessage(t, err) {
  switch (err.code) {
    case "EMPTY":
      return t("api.tenantLandingPage.formFieldsEmpty");
    case "TOO_MANY":
      return t("api.tenantLandingPage.formFieldsTooMany", { n: MAX_FORM_FIELDS });
    case "MISSING_LABEL":
      return t("api.tenantLandingPage.formFieldsMissingLabel");
    case "DUPLICATE_KEY":
      return t("api.tenantLandingPage.formFieldsDuplicateKey");
    case "UNKNOWN_TYPE":
      return t("api.tenantLandingPage.formFieldsUnknownType", { label: err.label });
    case "MISSING_OPTIONS":
      return t("api.tenantLandingPage.formFieldsMissingOptions", { label: err.label });
    case "MISSING_NAME":
      return t("api.tenantLandingPage.formFieldsMissingName");
    default:
      return t("api.common.somethingWentWrong");
  }
}

/** Same pattern as above, for lib/catalog.js's error codes. */
function catalogErrorMessage(t, err) {
  switch (err.code) {
    case "MISSING_TITLE":
      return t("api.tenantLandingPage.catalogNeedsTitle");
    case "NOT_INCLUDED":
      return t("api.tenantLandingPage.catalogNotIncluded");
    case "TOO_MANY":
      return t("api.tenantLandingPage.catalogTooMany", { n: err.n });
    default:
      return t("api.common.somethingWentWrong");
  }
}

/** Same pattern as above, for lib/faq.js's error codes. */
function faqErrorMessage(t, err) {
  switch (err.code) {
    case "INCOMPLETE":
      return t("api.tenantLandingPage.faqIncomplete");
    case "TOO_MANY":
      return t("api.tenantLandingPage.faqTooMany", { n: MAX_FAQ_ITEMS });
    default:
      return t("api.common.somethingWentWrong");
  }
}

export async function PATCH(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const {
    headline,
    headlineVariantB = "",
    subheadline,
    ctaLabel,
    features,
    backgroundMediaIds = [],
    backgroundOverlay = 0.55,
    showLogo = true,
    showTeamSection = false,
    galleryMediaIds = [],
    galleryColumns = 3,
    templateId,
    language,
    formFields,
    statusMessages,
    social,
    showSocialInHero = true,
    faq,
    faqHeading = "",
    catalog,
    catalogHeading = "",
    catalogNote = "",
  } = body;

  if (!headline?.trim() || !subheadline?.trim() || !ctaLabel?.trim()) {
    return NextResponse.json(
      { error: t("api.tenantLandingPage.heroFieldsRequired") },
      { status: 400 }
    );
  }

  if (!Array.isArray(features) || features.length === 0) {
    return NextResponse.json({ error: t("api.tenantLandingPage.needOneFeature") }, { status: 400 });
  }

  if (features.length > MAX_FEATURES) {
    return NextResponse.json(
      { error: t("api.tenantLandingPage.tooManyFeatures", { n: MAX_FEATURES }) },
      { status: 400 }
    );
  }

  const cleanFeatures = [];
  for (const feature of features) {
    const title = (feature?.title || "").trim();
    const description = (feature?.description || "").trim();
    const icon = (feature?.icon || "").trim();

    if (!title || !description) {
      return NextResponse.json(
        { error: t("api.tenantLandingPage.featureNeedsBoth") },
        { status: 400 }
      );
    }
    if (description.length > MAX_DESCRIPTION) {
      return NextResponse.json(
        { error: t("api.tenantLandingPage.descriptionTooLong", { n: MAX_DESCRIPTION }) },
        { status: 400 }
      );
    }
    if (!isValidIconKey(icon)) {
      return NextResponse.json({ error: t("api.tenantLandingPage.unknownIcon") }, { status: 400 });
    }

    const accentColor = feature?.accentColor || "primary";
    if (!CARD_COLORS.includes(accentColor)) {
      return NextResponse.json({ error: t("api.tenantLandingPage.unknownCardColour") }, { status: 400 });
    }

    cleanFeatures.push({
      title,
      description,
      icon,
      topStrip: Boolean(feature?.topStrip),
      border: Boolean(feature?.border),
      accentColor,
    });
  }

  if (!Array.isArray(backgroundMediaIds) || backgroundMediaIds.length > MAX_BACKGROUNDS) {
    return NextResponse.json(
      { error: t("api.tenantLandingPage.tooManyBackgrounds", { n: MAX_BACKGROUNDS }) },
      { status: 400 }
    );
  }

  const cleanBackgroundIds = [...new Set(backgroundMediaIds.filter(Boolean).map(String))];
  if (cleanBackgroundIds.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: t("api.tenantLandingPage.invalidBackgroundReference") }, { status: 400 });
  }

  const overlay = Number(backgroundOverlay);
  if (!Number.isFinite(overlay) || overlay < 0 || overlay > 1) {
    return NextResponse.json({ error: t("api.tenantLandingPage.overlayRange") }, { status: 400 });
  }

  // Only the shape is checked here. How many photos this tenant may actually
  // keep depends on their plan, which needs a database read — see below.
  if (!Array.isArray(galleryMediaIds) || galleryMediaIds.length > MAX_GALLERY) {
    return NextResponse.json(
      { error: t("api.tenantLandingPage.tooManyGalleryPhotos", { n: MAX_GALLERY }) },
      { status: 400 }
    );
  }

  const cleanGalleryIds = [...new Set(galleryMediaIds.filter(Boolean).map(String))];
  if (cleanGalleryIds.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: t("api.tenantLandingPage.invalidGalleryReference") }, { status: 400 });
  }

  const columns = Number(galleryColumns);
  if (!GALLERY_COLUMNS.includes(columns)) {
    return NextResponse.json({ error: t("api.tenantLandingPage.invalidGalleryColumns") }, { status: 400 });
  }

  if (templateId !== undefined && !templateIds().includes(templateId)) {
    return NextResponse.json({ error: t("api.tenantLandingPage.unknownTemplate") }, { status: 400 });
  }

  // Both are optional — the editor sends them together as part of its full
  // state, but nothing else in this route requires either to be present.
  let cleanFormFields;
  if (formFields !== undefined) {
    try {
      cleanFormFields = normalizeFormFields(formFields);
    } catch (err) {
      return NextResponse.json({ error: formFieldsErrorMessage(t, err) }, { status: 400 });
    }
  }

  let cleanSocial;
  if (social !== undefined) {
    cleanSocial = normalizeSocial(social);
    // A number that survived normalization but is too short to dial produces
    // a wa.me link that 404s for every visitor — better to reject the save
    // than to publish a dead button.
    if (cleanSocial.whatsapp.number && !isValidPhone(cleanSocial.whatsapp.number)) {
      return NextResponse.json(
        { error: t("api.tenantLandingPage.invalidWhatsappNumber") },
        { status: 400 }
      );
    }
  }

  let cleanFaq;
  if (faq !== undefined) {
    try {
      cleanFaq = normalizeFaq(faq);
    } catch (err) {
      return NextResponse.json({ error: faqErrorMessage(t, err) }, { status: 400 });
    }
  }

  let cleanLanguage;
  if (language !== undefined) {
    const code = String(language?.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: t("api.tenantLandingPage.chooseLanguage") }, { status: 400 });
    }
    // Same normalizer the AI agent's output goes through (see
    // lib/i18n/languages.js) — accepts a known code, a name, or an unknown
    // one, and infers direction rather than rejecting it.
    cleanLanguage = resolveContentLanguage(code, language?.name);
  }

  let cleanStatusMessages;
  if (statusMessages !== undefined) {
    cleanStatusMessages = {
      sending: String(statusMessages?.sending || "").trim().slice(0, 120),
      success: String(statusMessages?.success || "").trim().slice(0, 300),
      error: String(statusMessages?.error || "").trim().slice(0, 300),
    };
  }

  try {
    await connectDB();

    // The plan decides two of the limits below, so it has to be read before
    // anything is validated against them. Read here rather than trusted from
    // the session: `plan` is written by the Stripe webhook and a JWT issued
    // before a subscription lapsed would still claim "pro".
    const current = await Tenant.findById(tenantId).select("plan").lean();
    if (!current) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }
    const maxGallery = galleryLimit(current.plan);
    const maxCatalog = catalogLimit(current.plan);

    if (cleanGalleryIds.length > maxGallery) {
      return NextResponse.json(
        { error: t("api.tenantLandingPage.tooManyGalleryPhotos", { n: maxGallery }) },
        { status: 400 }
      );
    }

    // Undefined means an older client that doesn't know about the item list —
    // leave whatever is stored alone. An empty array is a real instruction:
    // it's how a tenant removes the section.
    let cleanCatalog;
    if (catalog !== undefined) {
      try {
        cleanCatalog = normalizeCatalog(catalog, { limit: maxCatalog });
      } catch (err) {
        return NextResponse.json({ error: catalogErrorMessage(t, err) }, { status: 400 });
      }
    }

    const cleanCatalogMediaIds = catalogMediaIds(cleanCatalog);
    if (cleanCatalogMediaIds.some((id) => !mongoose.isValidObjectId(id))) {
      return NextResponse.json(
        { error: t("api.tenantLandingPage.invalidGalleryReference") },
        { status: 400 }
      );
    }

    // Every referenced image must belong to this tenant — otherwise a crafted
    // request could hotlink another tenant's uploads onto this landing page.
    const allMediaIds = [...cleanBackgroundIds, ...cleanGalleryIds, ...cleanCatalogMediaIds];
    if (allMediaIds.length) {
      const owned = await tenantScoped(Media, tenantId).countDocuments({
        _id: { $in: allMediaIds },
      });
      if (owned !== allMediaIds.length) {
        return NextResponse.json(
          { error: t("api.tenantLandingPage.imageNotFound") },
          { status: 400 }
        );
      }
    }

    const setFields = {
      "landingPage.headline": headline.trim(),
      // Unconditional, not `|| skip` — clearing the field back to empty is
      // how a tenant turns the A/B test off, and that has to actually stick.
      "landingPage.headlineVariantB": String(headlineVariantB || "").trim().slice(0, 200),
      "landingPage.subheadline": subheadline.trim(),
      "landingPage.ctaLabel": ctaLabel.trim(),
      "landingPage.features": cleanFeatures,
      "landingPage.backgroundMediaIds": cleanBackgroundIds,
      "landingPage.backgroundOverlay": overlay,
      "landingPage.showLogo": Boolean(showLogo),
      "landingPage.showTeamSection": Boolean(showTeamSection),
      "landingPage.galleryMediaIds": cleanGalleryIds,
      "landingPage.galleryColumns": columns,
      "landingPage.showSocialInHero": Boolean(showSocialInHero),
      "landingPage.faqHeading": String(faqHeading || "").trim().slice(0, 120),
    };

    // Dotted paths, one per platform, rather than replacing the whole
    // `profile.social` subdocument — Settings edits the same four URL fields
    // from its own screen, and a whole-object $set from either side would
    // silently blank out whatever the other one owns.
    if (cleanSocial) {
      for (const [key, value] of Object.entries(cleanSocial)) {
        if (key === "whatsapp") {
          setFields["profile.social.whatsapp.number"] = value.number;
          setFields["profile.social.whatsapp.message"] = value.message;
        } else {
          setFields[`profile.social.${key}`] = value;
        }
      }
    }
    // Unconditional when present, including an empty array: clearing every
    // entry is how a tenant removes the FAQ section from their page.
    if (cleanFaq) setFields["landingPage.faq"] = cleanFaq;
    if (cleanCatalog) {
      setFields["landingPage.catalog"] = cleanCatalog;
      setFields["landingPage.catalogHeading"] = String(catalogHeading || "").trim().slice(0, 120);
      setFields["landingPage.catalogNote"] = String(catalogNote || "")
        .trim()
        .slice(0, MAX_CATALOG_NOTE);
    }
    if (templateId !== undefined) setFields.templateId = templateId;
    if (cleanFormFields) setFields["landingPage.formFields"] = cleanFormFields;
    if (cleanLanguage) setFields["landingPage.language"] = cleanLanguage;
    if (cleanStatusMessages) {
      // Unconditional, not `|| pack.default` — an empty string here is a
      // deliberate "clear the override, fall back to the language default"
      // rather than something to skip.
      setFields["landingPage.formLabels.sending"] = cleanStatusMessages.sending;
      setFields["landingPage.formLabels.success"] = cleanStatusMessages.success;
      setFields["landingPage.formLabels.error"] = cleanStatusMessages.error;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: setFields },
      { new: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      landingPage: tenant.landingPage,
      templateId: tenant.templateId,
      social: tenant.profile?.social,
    });
  } catch (err) {
    console.error("Updating landing page failed:", err);
    return NextResponse.json({ error: t("api.tenantLandingPage.saveFailed") }, { status: 503 });
  }
}
