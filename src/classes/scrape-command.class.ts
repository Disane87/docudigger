import { Command, Interfaces } from "@oclif/core";
import { BaseCommand } from "./base.class";
import { Browser, Page, Puppeteer } from "./puppeteer.class";

export type ScrapeFlags<T extends typeof Command> = Interfaces.InferredFlags<typeof ScrapeCommand[`baseFlags`] & T[`flags`]>
export type ScrapeArgs<T extends typeof Command> = Interfaces.InferredArgs<T[`args`]>

export abstract class ScrapeCommand<T extends typeof Command> extends BaseCommand<T> {

    private browser: Browser;
    private pupeteerArgs = [`--window-size=1920,1080`, `--no-sandbox`, `--disable-setuid-sandbox`];

    public selectorWaitTimeout = 2000;

    // static flags = {
        
    // };

    public async init(): Promise<void> {
        await super.init();
        // await this.initFlags();

        this.browser = await new Puppeteer(false, this.pupeteerArgs).setup();
        
    }

    protected async initFlags(){
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { args, flags } = await this.parse({
            flags: this.ctor.flags,
            baseFlags: (super.ctor as typeof ScrapeCommand).baseFlags,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags as ScrapeFlags<T>;
    }

    public async newPage(): Promise<Page> {
        return await this.browser.newPage();
    }

    public async closeBrowser(){
        return this.browser.close();
    }
}