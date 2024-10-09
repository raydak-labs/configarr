import { pino } from "pino";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? `info`;

export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: "pino-pretty",
  },
});

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
