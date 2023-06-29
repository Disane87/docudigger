import { Command, Flags, Interfaces } from '@oclif/core';
import winston from 'winston';
import { createLogger } from './helpers/logger.helper';
import { LogLevel } from './loglevel';
import { parseBool } from './helpers/parse-bool.helper';
import { exitListener } from './helpers/exit.helper';


export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand[`baseFlags`] & T[`flags`]>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T[`args`]>

export abstract class BaseCommand<T extends typeof Command> extends Command {
    // add the --json flag
    static enableJsonFlag = true;
    public abstract pluginName: string;


    protected logger: winston.Logger = null;

    //define flags that can be inherited by any command that extends BaseCommand
    static baseFlags = {
        logLevel: Flags.custom<LogLevel>({
            summary: `Specify level for logging.`,
            options: Object.values(LogLevel),
            default: LogLevel.info
        })(),

        debug: Flags.boolean({ char: `d`, default: true, env: `DEBUG`, parse: parseBool  }),
        logPath: Flags.string({ char: `l`, description: `Log path`, default: `./logs/`, env: `LOG_PATH` }),
        recurring: Flags.boolean({ char: `r`, default: true, env: `RECURRING`, parse: parseBool  }),
        recurringCron: Flags.string(({ char: `c`, description: `Cron pattern to execute periodically`, env: `RECURRING_PATTERN`, default: `* * * * *`, dependsOn: [`recurring`] }))

    };

    protected flags!: Flags<T>;

    public async init(): Promise<void> {
        await super.init();

        const { args, flags } = await this.parse({
            flags: this.ctor.flags,
            baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags as Flags<T>;

        this.logger = createLogger(this.flags?.logLevel || LogLevel.info, this.flags?.logPath || `./logs/`, this.id);
        exitListener(this.logger);


        // this.logger.info(`Got flags for plugin ${this.id} -> ${JSON.stringify(flags, null, 4)}`);
    }

    protected async catch(err: Error & { exitCode?: number }): Promise<unknown> {
        // add any custom logic to handle errors from the command
        // or simply return the parent class error handling
        return super.catch(err);
    }

    protected async finally(_: Error | undefined): Promise<unknown> {
        // called after run and catch regardless of whether or not the command errored
        return super.finally(_);
    }
}