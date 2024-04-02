import { commonjs } from "@hyrious/esbuild-plugin-commonjs";
import { build } from "esbuild";

build({
  entryPoints: ["index.ts"],
  bundle: true,
  format: "esm",
  external: ["fs", "child_process", "crypto", "os", "path"],
  outfile: "out.js",
  plugins: [commonjs()],
}).catch(() => process.exit(1));
