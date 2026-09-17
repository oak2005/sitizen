import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = ".vercel/output/functions/__server.func/_ssr";
if (existsSync(dir)) {
  function rewrite(file, fn) {
    const src = readFileSync(file, "utf8");
    const next = fn(src);
    if (next !== src) {
      writeFileSync(file, next);
      console.log("[patch-ssr] rewrote", file);
    }
  }

  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".mjs")) continue;
    const file = join(dir, name);
    rewrite(file, (src) => {
      let next = src.replaceAll("ssr_exports as s", "server_default as s");
      next = next.replace(
        'import { c as __exportAll$1 } from "./ssr.mjs";\n',
        'import { r as __exportAll$1 } from "../_runtime.mjs";\n',
      );
      next = next.replace(
        'import { c as __exportAll } from "./ssr.mjs";',
        'import { r as __exportAll } from "../_runtime.mjs";',
      );
      if (name.startsWith("db-")) {
        next = next.replaceAll("__exportAll$1(", "__exportAll(");
      }
      next = next.replace(
        'import "../_runtime.mjs";\nimport { r as __exportAll$1 } from "../_runtime.mjs";\n',
        'import { r as __exportAll$1 } from "../_runtime.mjs";\n',
      );
      return next;
    });
  }
}

const pgliteSrc = "node_modules/@electric-sql/pglite/dist";
const pgliteDest = ".vercel/output/functions/__server.func/_libs";
if (existsSync(pgliteSrc) && existsSync(pgliteDest)) {
  mkdirSync(pgliteDest, { recursive: true });
  for (const name of ["pglite.wasm", "pglite.data", "initdb.wasm"]) {
    const from = join(pgliteSrc, name);
    const to = join(pgliteDest, name);
    if (existsSync(from)) {
      copyFileSync(from, to);
      console.log("[patch-ssr] copied", name);
    }
  }
}
