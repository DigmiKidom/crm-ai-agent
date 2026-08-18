import {
  IconCheckSquare,
  IconNote,
  IconQuote,
  IconStar,
  IconWallet,
} from "@/components/icons";

// The registry in lib/plugins.js names its icon as a string rather than
// importing a component, so that module can stay free of React and be imported
// by the Edge proxy and by bare-Node tests. This is where the name becomes a
// component, and the only file that has to know both.
const ICONS = {
  checkSquare: IconCheckSquare,
  note: IconNote,
  wallet: IconWallet,
  quote: IconQuote,
  star: IconStar,
};

export function pluginIcon(name) {
  return ICONS[name] ?? IconNote;
}
