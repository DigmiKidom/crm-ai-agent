// Resolves the "@/..." jsconfig alias and adds the .js extension Next's bundler
// supplies implicitly, so lib modules can be imported by plain Node.
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
export function resolve(spec, ctx, next) {
  let s = spec;
  if (s.startsWith("@/")) s = pathToFileURL(path.join(root, s.slice(2))).href;
  if ((s.startsWith("file:") || s.startsWith(".")) && !path.extname(s)) {
    const base = s.startsWith("file:") ? new URL(s).pathname : path.resolve(path.dirname(new URL(ctx.parentURL).pathname), s);
    if (fs.existsSync(base + ".js")) s = pathToFileURL(base + ".js").href;
  }
  return next(s, ctx);
}
