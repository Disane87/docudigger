// The signals we want to handle

import winston from "winston";

// NOTE: although it is tempting, the SIGKILL signal (9) cannot be intercepted and handled
const signals = {
    'SIGHUP': 1,
    'SIGINT': 2,
    'SIGTERM': 15
};
// Do any necessary shutdown logic for our application here
const shutdown = (signal, value, logger: winston.Logger) => {
    logger.warn(`server stopped by ${signal} with value ${value}`);
    process.exit(128 + value);
};

export const exitListener = (logger: winston.Logger) => {
    Object.keys(signals).forEach((signal) => {
        process.on(signal, () => {
            logger.warn(`process received a ${signal} signal`);
            shutdown(signal, signals[signal], logger);
        });
    });
};

export const exit = (logger: winston.Logger, recurring: boolean) => {
    if(!recurring){
        logger.info(`All done. Exiting`);
        process.emit(`SIGINT`);
        process.exit();
    } else {
        logger.info(`Recurring activated. Not terminating. Waiting for next run.`);
    }
};
// Create a listener for each of the signals that we want to handle
