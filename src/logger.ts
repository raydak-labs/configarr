import pino from "pino";
import { LOG_LEVEL } from "./config";

import pretty from "pino-pretty";

const stream = pretty({
  levelFirst: true,
  colorize: true,
  ignore: "hostname,pid",
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
