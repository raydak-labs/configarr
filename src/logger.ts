import { levels, pino } from "pino";
import pretty from "pino-pretty";
import { getEnvs, getHelpers } from "./env";

const maxArrayLength = Object.values(levels.labels).reduce((maxLength, currentArray) => {
  return Math.max(maxLength, currentArray.length);
}, 0);

// Function to format a level string by appending spaces
const neededSpaces = (level: string): string => {
  const spacesNeeded = maxArrayLength - level.length;
  const spaces = " ".repeat(spacesNeeded > 0 ? spacesNeeded : 0);
  return `${spaces}`;
};

const transformedLevelMap = Object.entries(levels.values).reduce((p, [key, value]) => {
  p.set(key.toUpperCase(), neededSpaces(key));

  return p;
}, new Map<string, string>());

const isJsonFormat = getEnvs().LOG_FORMAT === "json";

// LOG_FORMAT=json: no stream, so pino falls back to raw JSON lines on stdout
const stream = isJsonFormat
  ? undefined
  : pretty({
      levelFirst: true,
      ignore: "hostname,pid",
      // @ts-ignore Temporary weird error
      customPrettifiers: {
        level: (level, key, log, { colors, label, labelColorized }) => `${labelColorized}${transformedLevelMap.get(label)}`,
      },
    });

export const logger = pino(
  {
    level: getEnvs().LOG_LEVEL,
    // transport: {
    //   target: "pino-pretty",
    //   options: {
    //     colorize: true,
    //   },
    // },
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

export const logSeparator = () => {
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

// For debugging how envs have been loaded
logger.debug({ envs: getEnvs(), helpers: getHelpers() }, `Loaded following configuration from ENVs and mapped`);
