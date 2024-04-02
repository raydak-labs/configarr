import esbuild from "esbuild";

await esbuild.build({
  //inject: ["cjs-shim.ts"],
  entryPoints: ["index.ts"],
  bundle: true,
  format: "cjs",
  external: ["fs", "child_process", "crypto", "os", "path"],
  outfile: "out2.js",
});
