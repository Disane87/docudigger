import * as path from "path";
import winston, { format } from "winston";

export const createLogger = (
  logLevel: string,
  logPath: string,
  context = `DocuDigger`,
) => {
  const logFormat = format.combine(
    format.label({ label: context }),
    format.timestamp({
      format: `YYYY-MM-DD HH:MM:ss`,
    }),
    format.prettyPrint(),
    format.colorize(),
    format.align(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    format.printf((info: any) => {
      return `[${info.level}] [${info.timestamp}] [${info.label}]: ${info.message}`;
    }),
  );

  return winston.createLogger({
    level: logLevel.toString(),
    format: logFormat,

    rejectionHandlers: [
      new winston.transports.File({ filename: `rejections.log` }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: `exceptions.log` }),
    ],
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
      new winston.transports.File({
        filename: path.join(logPath, `error.log`).normalize(),
        level: `error`,
      }),
      new winston.transports.File({
        filename: path.join(logPath, `verbose.log`).normalize(),
        level: `verbose`,
      }),
      new winston.transports.File({
        filename: path.join(logPath, `combined.log`).normalize(),
      }),
    ],
  });
};
