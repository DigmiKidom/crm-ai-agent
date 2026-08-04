import DefaultTemplate from "@/components/templates/default/LandingTemplate";
import MinimalTemplate from "@/components/templates/minimal/LandingTemplate";
import BoldTemplate from "@/components/templates/bold/LandingTemplate";

// The template registry. Adding a new template later means adding one more
// entry here (plus its own component/CSS folder) — no changes needed to
// tenant data or the rest of the app.
export const TEMPLATES = {
  default: {
    id: "default",
    name: "Classic",
    description:
      "Bold color-block hero with a side-by-side feature grid. A safe general-purpose default for most service businesses.",
    Component: DefaultTemplate,
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description:
      "Clean, editorial, mostly white space with left-aligned type and a simple feature list. Good fit for professional services, consulting, legal, or healthcare.",
    Component: MinimalTemplate,
  },
  bold: {
    id: "bold",
    name: "Bold",
    description:
      "High-energy gradient hero with a big pill-shaped CTA and icon feature cards. Good fit for agencies, startups, fitness/wellness, or consumer brands.",
    Component: BoldTemplate,
  },
};

export function getTemplate(templateId) {
  return TEMPLATES[templateId] || TEMPLATES.default;
}

export function templateIds() {
  return Object.keys(TEMPLATES);
}

export function templateList() {
  return Object.values(TEMPLATES).map(({ id, name, description }) => ({ id, name, description }));
}
