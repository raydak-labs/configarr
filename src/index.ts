// those must be run first!
import "dotenv/config";
import { initEnvs } from "./env";
initEnvs();

import { run } from "./run";

run();
