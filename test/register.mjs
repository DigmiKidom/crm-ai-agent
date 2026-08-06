import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Teaches plain Node the "@/…" jsconfig alias and Next's implicit .js
// extensions, so lib/ modules can be unit-tested without a bundler.
register("./alias-loader.mjs", pathToFileURL("./test/"));
