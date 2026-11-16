import { levels, pino } from "pino";
import pretty from "pino-pretty";
import { getEnvs, getHelpers } from "./env";

const levelNames = Object.keys(levels.values);
const maxLevelLength = Math.max(...levelNames.map((level) => level.length));
const levelPadding = new Map(levelNames.map((level) => [level.toUpperCase(), " ".repeat(maxLevelLength - level.length)] as const));

const isJsonFormat = getEnvs().LOG_FORMAT === "json";

// LOG_FORMAT=json: no stream, so pino falls back to raw JSON lines on stdout
const stream = isJsonFormat
  ? undefined
  : pretty({
      // Synchronous writes: lines logged right before an exit or crash are not lost.
      sync: true,
      levelFirst: true,
      ignore: "hostname,pid",
      customPrettifiers: {
        level: (_level, _key, _log, { label, labelColorized }) => `${labelColorized}${levelPadding.get(label) ?? ""}`,
      },
    });

export const logger = pino(
  {
    level: getEnvs().LOG_LEVEL,
    // JSON: level as label ("info") instead of number (30). Spread so text mode keeps pino's defaults.
    ...(isJsonFormat && {
      formatters: {
        level: (label) => ({ level: label }),
      },
    }),
  },
  stream,
);

// Decorations are for human-readable text output; JSON output only gets the plain title.
export const logBlankLine = () => {
  if (isJsonFormat) {
    return;
  }
  logger.info("");
};

const logSeparator = () => {
  if (isJsonFormat) {
    return;
  }
  logger.info(`#############################################`);
};

export const logHeading = (title: string) => {
  if (isJsonFormat) {
    logger.info(title);
    return;
  }
  logBlankLine();
  logSeparator();
  logger.info(`### ${title}`);
  logSeparator();
  logBlankLine();
};

export const logInstanceHeading = (title: string) => {
  logger.info(isJsonFormat ? title : `### ${title}`);
};

logger.debug({ envs: getEnvs(), helpers: getHelpers() }, `Loaded following configuration from ENVs and mapped`);
