import { Command, Flags, Interfaces } from "@oclif/core";
import fs from "fs";
import path from "path";
import { parseBool } from "../helpers/parse-bool.helper";
import { ProcessedWebsites } from "../interfaces/processed-website.interface";
import { Scrape } from "../interfaces/scrape.interface";
import { WebsiteRun } from "../interfaces/website-run.interface";
import { BaseCommand, BaseFlags } from "./base.class";
import { Browser, Page, Puppeteer } from "./puppeteer.class";
import { isRunningInDocker } from "../helpers/process.helper";
import { FileHandler } from "../commands/scrape/amazon/helpers/file.helper";

export type ScrapeFlags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof ScrapeCommand)[`baseFlags`] & T[`flags`]
> &
  BaseFlags<T>;
export type ScrapeArgs<T extends typeof Command> = Interfaces.InferredArgs<
  T[`args`]
>;

export abstract class ScrapeCommand<
  T extends typeof Command,
> extends BaseCommand<T> {
  private browser: Browser;

  private pupeteerArgs = [
    `--window-size=1920,1080`,
    `--no-sandbox`,
    `--disable-setuid-sandbox`,
  ];

  public selectorWaitTimeout = 2000;

  protected flags!: ScrapeFlags<T>;
  static baseFlags = {
    ...super.baseFlags,
    subFolderForPages: Flags.boolean({
      aliases: [`subFolderForPages`],
      description: `Creates subfolders for every scraped page/plugin`,
      env: `SUBFOLDER_FOR_PAGES`,
      parse: parseBool,
    }),
    fileDestinationFolder: Flags.string({
      aliases: [`fileDestinationFolder`],
      default: `./data/`,
      description: `Amazon top level domain`,
      env: `FILE_DESTINATION_FOLDER`,
    }),
    fileFallbackExentension: Flags.string({
      aliases: [`fileFallbackExentension`],
      default: `.pdf`,
      description: `Amazon top level domain`,
      env: `FILE_FALLBACK_EXTENSION`,
    }),
    onlyNew: Flags.boolean({
      aliases: [`onlyNew`],
      description: `Gets only new invoices`,
      env: `ONLY_NEW`,
      parse: parseBool,
    }),
  };

  private processedWebsites: ProcessedWebsites = {};

  public processJsonFile: string;

  public fileHandler: FileHandler<T>;

  // public currentPage: Page;

  public async init(): Promise<void> {
    await super.init();
    await this.initFlags();

    this.fileHandler = new FileHandler(this.logger, this.flags, this.pluginName);

    this.processJsonFile = path
      .resolve(path.join(this.flags.fileDestinationFolder, `process.json`))
      .normalize();

    this.logger.debug(`processJsonFile: ${this.processJsonFile}`);
    this.logger.debug(`fileDestinationFolder: ${this.flags.fileDestinationFolder}`);
    this.logger.debug(`Running in Docker: ${isRunningInDocker()}`);
    this.browser = await new Puppeteer(this.flags.debug, this.pupeteerArgs, isRunningInDocker()).setup();
  }

  protected async initFlags() {
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
    const page = await this.browser.newPage();
    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    return page;
  }

  async getActivePage(timeout: number = 500) {
    const start = new Date().getTime();
    while (new Date().getTime() - start < timeout) {
      const pages = await this.browser.pages();
      const arr = [];
      for (const p of pages) {
        if (
          await p.evaluate(() => {
            return document.visibilityState == `visible`;
          })
        ) {
          arr.push(p);
        }
      }
      if (arr.length == 1) return arr[0];
    }
    throw `Unable to get active page. Please open up a github issue`;
  }

  public async closeBrowser() {
    return this.browser.close();
  }

  public async getLastWebsiteRun(): Promise<WebsiteRun | undefined | null> {
    if (fs.existsSync(this.processJsonFile) && this.processJsonFile) {
      this.processedWebsites = JSON.parse(
        await fs.promises.readFile(this.processJsonFile, `utf8`),
      );

      const websiteScrapes = this.processedWebsites[this.pluginName.toLowerCase()];
      const documentCount = websiteScrapes.scrapes.length;

      if (documentCount === 0) {
        this.logger.warn(`No latest orders. OnlyNew deactivated.`);
        this.flags.onlyNew = false;
        return null;
      }

      return websiteScrapes;
    } else {
      this.logger.warn(
        `process.json not found. Full run needed. OnlyNew deactivated. `,
      );
      this.flags.onlyNew = false;
      return undefined;
    }
  }

  public writeProcessFile(documents: Array<Scrape>) {
    const processedWebsite =
      this.processedWebsites[this.pluginName.toLowerCase()];
    if (!processedWebsite) {
      this.processedWebsites = {
        [this.pluginName.toLowerCase()]: {
          lastRun: new Date(),
          scrapes: documents,
        },
      };
    } else {
      processedWebsite.lastRun = new Date();
      processedWebsite.scrapes.push(...documents);
    }

    try {
      fs.writeFileSync(
        this.processJsonFile,
        JSON.stringify(this.processedWebsites, null, 4),
      );
    } catch (ex) {
      this.logger.error(`Error writing process.json file: ${ex}`);
    }
  }
}
