import { levels, pino } from "pino";
import pretty from "pino-pretty";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? `info`;

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

const stream = pretty({
  levelFirst: true,
  ignore: "hostname,pid",
  // @ts-ignore Temporary weird error
  customPrettifiers: {
    level: (level, key, log, { colors, label, labelColorized }) => `${labelColorized}${transformedLevelMap.get(label)}`,
  },
});

export const logger = pino(
  {
    level: LOG_LEVEL,
    // transport: {
    //   target: "pino-pretty",
    //   options: {
    //     colorize: true,
    //   },
    // },
  },
  stream,
);

export const logSeparator = () => {
  logger.info(`#############################################`);
};

export const logHeading = (title: string) => {
  logger.info("");
  logSeparator();
  logger.info(`### ${title}`);
  logSeparator();
  logger.info("");
};
