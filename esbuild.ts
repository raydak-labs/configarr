import esbuild from "esbuild";

const externalizedModules = {};

await esbuild.build({
  //inject: ["cjs-shim.ts"],
  entryPoints: ["./src/index.ts"],
  bundle: true,
  sourcemap: "inline",
  platform: "node",
  target: "node20",
  //external: ["fs", "child_process", "crypto", "os", "path"],
  //plugins: [externalNativeModulesPlugin(externalizedModules)],

  format: "cjs",
  outfile: "bundle.cjs",

  //format: "esm",
  //outfile: "out2.mjs",
});
