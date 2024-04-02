import pino from "pino";
import { LOG_LEVEL } from "./config";

export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
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
