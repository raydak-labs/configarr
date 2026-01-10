import esbuild from "esbuild";

const externalizedModules = {};

// Get build-time constants from environment variables (set by Docker build args)
const buildTime = process.env.BUILD_TIME ?? "";
const githubRunId = process.env.GITHUB_RUN_ID ?? "";
const githubRepo = process.env.GITHUB_REPO ?? "";
const githubSha = process.env.GITHUB_SHA ?? "";
const configarrVersion = process.env.CONFIGARR_VERSION ?? "dev";

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

  // Inject build-time constants using define
  define: {
    "process.env.BUILD_TIME": JSON.stringify(buildTime),
    "process.env.GITHUB_RUN_ID": JSON.stringify(githubRunId),
    "process.env.GITHUB_REPO": JSON.stringify(githubRepo),
    "process.env.GITHUB_SHA": JSON.stringify(githubSha),
    "process.env.CONFIGARR_VERSION": JSON.stringify(configarrVersion),
  },

  //format: "esm",
  //outfile: "out2.mjs",
});
