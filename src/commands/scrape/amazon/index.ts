import { Flags } from "@oclif/core";
import { DateTime } from "luxon";
import { ElementHandle, HTTPResponse } from "puppeteer";
import { Page } from "../../../classes/puppeteer.class";
import { ScrapeCommand } from "../../../classes/scrape-command.class";
import { InvoiceStatus } from "../../../enums/invoice-status.enum";
import { login } from "./helpers/auth.helper";
import { exit } from "../../../helpers/exit.helper";
import { AmazonOptions } from "../../../interfaces/amazon-options.interface";
import { AmazonDefinition } from "../../../interfaces/amazon.interface";
import { Invoice } from "../../../interfaces/invoice.interface";
import { Scrape } from "../../../interfaces/scrape.interface";
import { AmazonSelectors } from "../../../interfaces/selectors.interface";
import { WebsiteRun } from "../../../interfaces/website-run.interface";
import { amazonSelectors } from "./helpers/selectors.helper";

export default class Amazon extends ScrapeCommand<typeof Amazon> {
    public pluginName = `amazon`;
    static description = `Scrapes amazon invoices`;
    static summary = `Used to get invoices from amazon`;

    static examples = [
        `<%= config.bin %> <%= command.id %>`,
    ];

    static flags = {
        username: Flags.string({ char: `u`, description: `Username`, required: true, env: `AMAZON_USERNAME` }),
        password: Flags.string({ char: `p`, description: `Password`, required: true, env: `AMAZON_PASSWORD` }),
        tld: Flags.string({ char: `t`, description: `Amazon top level domain`, default: `de`, env: `AMAZON_TLD` }),
        yearFilter: Flags.integer({ aliases: [`yearFilter`], description: `Filters a year`, env: `AMAZON_YEAR_FILTER` }),
        pageFilter: Flags.integer({ aliases: [`pageFilter`], description: `Filters a page`, env: `AMAZON_PAGE_FILTER` }),
    };

    private possibleYears: number[] = [];
    private selectors: AmazonSelectors;
    private definition: AmazonDefinition;
    private lastWebsiteRun: WebsiteRun;
    private lastScrapeWithInvoices: Scrape;
    private currentPage: Page;
    private options: AmazonOptions;

    public async run(): Promise<void> {
        this.options = this.flags;
        await this.handleOnlyNewOption();
        this.logger.debug(`Options: ${JSON.stringify(this.options, null, 4)}`);
        this.currentPage = await this.newPage();

        const { amazonSelectors, amazon } = this.getSelectors(this.options.tld);
        this.selectors = amazonSelectors;
        this.definition = amazon;

        await login(this.currentPage, amazonSelectors, this.options, amazon, this.logger, this);

        if (this.options.debug) {
            await this.currentPage.setViewport({ width: 1920, height: 1080 });
        }
        amazon.lang = await this.currentPage.$eval(`html`, el => el.lang);
        this.logger.debug(`Page language: ${amazon.lang}`);

        await this.goToOrderPage(amazon);

        this.possibleYears = await this.getPossibleYears(this.options.yearFilter);
        const processedOrders = await this.processYears();

        await this.endProcess(DateTime.now(), processedOrders, this.options);
    }

    private async handleOnlyNewOption(): Promise<void> {
        if (this.options.onlyNew) {
            this.logger.info("OnlyNew activated.");
            this.logger.info("Getting last run");
            this.lastWebsiteRun = await this.getLastWebsiteRun();
            this.logger.info(`Getting last run. Got: ${this.lastWebsiteRun}`);

            if (this.lastWebsiteRun?.scrapes.length > 0) {
                this.lastScrapeWithInvoices = this.lastWebsiteRun.scrapes.find(
                    (scrape) =>
                        scrape.invoices.length > 0 &&
                        scrape.invoices.every(
                            (invoice) => invoice.status == InvoiceStatus.saved || invoice.status == InvoiceStatus.skipped,
                        ),
                );
                this.logger.info(`Only invoices since order ${this.lastScrapeWithInvoices.number} will be gathered.`);
                this.options.pageFilter = 1;
                this.options.onlyNew = true;
            } else {
                this.logger.info("No latest scrape found. Processing all years and pages.");
                this.options.yearFilter = undefined;
                this.options.pageFilter = undefined;
            }
        }
    }

    private async goToOrderPage(amazon: AmazonDefinition): Promise<HTTPResponse> {
        this.logger.debug(`Going to order page...`);
        return await this.goToYearAndPage(DateTime.now().year, 0, amazon);
    }

    private async processYears(): Promise<Scrape[]> {
        this.logger.info(`Processing years ${this.possibleYears}`);
        const processedOrders: Scrape[] = [];

        for (const currentYear of this.possibleYears) {
            this.logger.info(`Starting year ${currentYear}`);
            const orderPageCount = await this.getOrderPageCount(currentYear);
            if (orderPageCount == null) {
                this.logger.error(`Couldn't get orderPageCount. Exiting.`);
                return;
            }
            this.logger.debug(`Got ${orderPageCount} for year ${currentYear}`);

            for (const orderPage of [...Array(orderPageCount).keys()].map(pageNo => pageNo + 1)) {
                if (this.options.pageFilter && orderPage != this.options.pageFilter) {
                    this.logger.info(`Skipping page ${orderPage} due to page filter`);
                    continue;
                }

                this.logger.info(`Processing page ${orderPage}`);
                await this.goToYearAndPage(currentYear, orderPage, this.definition);
                const onlyNewInvoiceHandled = await this.processOrderPage(orderPage, processedOrders);
                if (onlyNewInvoiceHandled) {
                    return processedOrders;
                }
            }

            this.logger.info(`Year "${currentYear}" done. ${this.options.yearFilter === currentYear ? 'Skipping next years' : 'Skipping to next year'}`);
            if (this.options.yearFilter === currentYear) {
                return processedOrders;
            }
        }
    }

    private async processOrderPage(orderPage: number, processedOrders: Scrape[]): Promise<boolean> {
        this.logger.info(`Checking page ${orderPage} for orders`);
        const orderCards = await this.currentPage.$$(this.selectors.orderCards);
        this.logger.info(`Got ${orderCards.length} orders. Processing...`);

        let onlyNewInvoiceHandled = false;

        for (const [orderIndex, orderCard] of orderCards.entries()) {
            const { orderNumber, order } = await this.getOrder(orderCard);
            await this.clickInvoiceSpan(orderCard, orderIndex);
            const invoiceUrls = await this.getInvoiceUrls(orderIndex);

            if (this.options.onlyNew && (orderNumber == this.lastScrapeWithInvoices?.number)) {
                this.logger.info(`Order ${orderNumber} already handled. Exiting.`);
                onlyNewInvoiceHandled = true;
            }

            order.invoices = this.getInvoices(invoiceUrls, orderIndex);
            processedOrders.push(order);
            this.logger.info(`Processing "${processedOrders.length}" orders`);

            if (this.options.onlyNew && onlyNewInvoiceHandled) {
                break;
            }

            await this.getInvoiceDocumentsFromOrder(order);
        }

        return onlyNewInvoiceHandled;
    }

    private async getOrderPageCount(year: number): Promise<number> {
        this.logger.debug(`Determining order pages...`);
        let orderPageCount: number = null;
        await this.goToYearAndPage(year, 0, this.definition);

        try {
            orderPageCount = await (await this.currentPage.waitForSelector(this.selectors.pagination, { timeout: this.selectorWaitTimeout })).evaluate((handle: HTMLElement) => parseInt(handle.innerText));
            this.logger.info(`Determined order pages ${orderPageCount}`);
        } catch (ex) {
            orderPageCount = 1;
            this.logger.error(`Couldn't get orderPageCount ${orderPageCount} within ${this.selectorWaitTimeout}ms. Assume only one page.`);
        }
        this.logger.info(`Page count: ${orderPageCount}`);
        return orderPageCount;
    }

    private async goToYearAndPage(year: number, orderPage: number, amazon: AmazonDefinition): Promise<HTTPResponse> {
        this.logger.debug(`Going to year... ${year} order page ${orderPage}`);
        const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${year}&search=&startIndex=${10 * (orderPage)}`, amazon.orderPage);
        return await this.currentPage.goto(nextPageUrl.toString());
    }

    private async clickInvoiceSpan(orderCard: ElementHandle<Element>, orderIndex: number): Promise<void> {
        const invoiceSpan = await orderCard.$(this.selectors.invoiceSpans);
        invoiceSpan.click();
        this.logger.debug(`Checking popover ${orderIndex + 1}`);
    }

    private getInvoices(invoiceUrls: string[], orderIndex: number): Invoice[] {
        this.logger.debug(`Getting invoices...`);
        if (invoiceUrls.length == 0) {
            this.logger.warn(`No invoices found. Order may be undelivered. Check again later.`);
            return [];
        } else {
            const invoices: Array<Invoice> = invoiceUrls.map(invoiceUrl => ({ url: invoiceUrl, status: InvoiceStatus.determined } as Invoice));
            this.logger.info(`${invoices.length} invoices found 📃`);
            this.logger.debug(`Got invoice url ${(orderIndex + 1)} -> ${invoiceUrls}`);
            return invoices;
        }
    }

    private async getInvoiceDocumentsFromOrder(order: Scrape): Promise<void> {
        this.logger.debug(`Getting invoice documents...`);
        for (const [invoiceIndex, invoice] of order.invoices.entries()) {
            const invoiceUrl = invoice.url;
            await new Promise(resolve => setTimeout(resolve, 100));
            const pdfPage = await this.newPage();
            await pdfPage.goto(invoiceUrl);
            invoice.status = InvoiceStatus.opened;

            try {
                const fileReaderString = await this.fileHandler.getFileReaderString(pdfPage, invoiceUrl);
                const fileBuffer = this.fileHandler.getFileBuffer(fileReaderString, invoice, order, invoiceUrl);
                if (fileBuffer) {
                    this.logger.debug(`Buffer exists`);
                    this.logger.info(`Checking if folder exists. If not, create: ${this.options.fileDestinationFolder}`);
                    const { destPluginFileFolder, pathNormalized } = this.fileHandler.getPaths(invoiceUrl, order, invoiceIndex);
                    this.fileHandler.writeFile(destPluginFileFolder, pathNormalized, invoice, fileBuffer, order);
                }
            } catch (ex) {
                this.logger.error(`Error while fetching from url "${invoiceUrl}": ${ex.message}`);
            }

            this.logger.debug(`Closing invoice page`);
            await pdfPage.close();
        }
    }

    private async getPossibleYears(yearFilter: number | undefined): Promise<number[]> {
        this.logger.debug(`Getting possible years...`);
        let possibleYears: number[];

        if (!yearFilter) {
            this.logger.info("Year filter undefined. Getting all possible years");
            await this.currentPage.waitForSelector(`${this.selectors.yearFilter} option[value^='year-']`);
            possibleYears = await (await this.currentPage.$$eval(this.selectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n)
        } else {
            this.logger.info(`Year filter set to ${yearFilter}`);
            possibleYears = [yearFilter];
        }

        this.logger.debug(`Checking possible years. Got ${possibleYears}`);
        this.logger.info(`First possible year: ${possibleYears[0]}`);
        this.logger.info(`Last possible year: ${possibleYears[possibleYears.length - 1]}`);
        return possibleYears;
    }

    private async getInvoiceUrls(orderIndex: number): Promise<string[]> {
        this.logger.debug(`Getting invoice urls...`);
        let invoiceUrls: string[] = [];
        const popoverSelectorResolved = this.selectors.popover.replace(`{{index}}`, (orderIndex + 1).toString());

        try {
            const popover = await this.currentPage.waitForSelector(popoverSelectorResolved, { timeout: this.selectorWaitTimeout });
            this.logger.debug(`Got popover ${(orderIndex + 1)} -> ${popover}`);
            const invoiceList = await popover.waitForSelector(this.selectors.invoiceList, { timeout: this.selectorWaitTimeout });
            invoiceUrls = await invoiceList.$$eval(this.selectors.invoiceLinks, (handles: HTMLAnchorElement[]) => handles.map(a => a.href));
            this.logger.debug(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
        } catch (ex) {
            this.logger.error(`Couldn't get popover ${popoverSelectorResolved} within ${this.selectorWaitTimeout}ms. Skipping`);
        }
        return invoiceUrls;
    }

    private async getOrder(orderCard: ElementHandle<Element>): Promise<{ orderNumber: string, order: Scrape }> {
        this.logger.debug(`Getting order...`);
        try {
            const orderNumber: string = await orderCard.$eval(this.selectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());
            this.logger.info(`Order number: ${orderNumber}`);
            const orderDate = await orderCard.$eval(this.selectors.orderDate, (handle: HTMLElement) => handle.innerText);
            const orderDateLuxon = DateTime.fromFormat(orderDate, `DDD`, { locale: this.definition.lang }).toISODate();
            const order: Scrape = {
                date: orderDateLuxon,
                datePlain: orderDate,
                invoices: [],
                number: orderNumber
            };
            this.logger.debug(`Got Order: ${orderNumber}`);
            this.logger.info(`Order date: ${orderDate}`);
            return { orderNumber, order };
        } catch (error) {
            this.logger.error(`Failed to get order details: ${error.message}`);
            throw error;
        }
    }

    private async endProcess(starttimestamp: DateTime, orders: Scrape[], options: AmazonOptions): Promise<void> {
        const endtimestamp = DateTime.now();
        const timeElapsed = endtimestamp.diff(starttimestamp, [`minutes`]);

        if (orders?.length > 0) {
            const invoiceCount = orders.reduce((prev, order) => prev + order.invoices.length, 0);
            this.logger.info(`Processing done. Processed ${invoiceCount} invoices in ${timeElapsed.minutes.toFixed(2)} minutes.`);
            this.writeProcessFile(orders);
        }

        if (options.debug) {
            await this.closeBrowser();
        }

        exit(this.logger, options.recurring);
    }

    private getSelectors(tld: string): { amazonSelectors: AmazonSelectors, amazon: AmazonDefinition } {
        this.logger.debug(`Getting selectors...`);
        const amazon: AmazonDefinition = {
            lang: null,
            tld,
            loginPage: `https://www.amazon.${tld}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`,
            orderPage: `https://www.amazon.${tld}/gp/css/order-history`
        };
        return { amazonSelectors, amazon };
    }
}
