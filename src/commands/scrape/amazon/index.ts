

import { Flags } from "@oclif/core";
import fs from "fs";
import { DateTime } from "luxon";
import path from "path";
import { ElementHandle, HTTPResponse } from "puppeteer";
import { Page } from "../../../classes/puppeteer.class";
import { ScrapeCommand } from "../../../classes/scrape-command.class";
import { InvoiceStatus } from "../../../enums/invoice-status.enum";
import { login } from "../../../helpers/auth.helper";
import { exit } from "../../../helpers/exit.helper";
import { AmazonOptions } from "../../../interfaces/amazon-options.interface";
import { AmazonDefinition } from "../../../interfaces/amazon.interface";
import { Invoice } from "../../../interfaces/invoice.interface";
import { Scrape } from "../../../interfaces/scrape.interface";
import { AmazonSelectors } from "../../../interfaces/selectors.interface";
import { WebsiteRun } from "../../../interfaces/website-run.interface";


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

    public async run(): Promise<void> {
        const options: AmazonOptions = this.flags;
        this.lastWebsiteRun = await this.getLastWebsiteRun();

        // Get the latest scrape with order number from the last website run which contains minimum one invoice and all with status saved
        if (this.lastWebsiteRun?.scrapes.length > 0) {
            this.lastScrapeWithInvoices = this.lastWebsiteRun.scrapes.find(
                (scrape) =>
                    scrape.invoices.length > 0 &&
                    scrape.invoices.every(
                        (invoice) => invoice.status == InvoiceStatus.saved || invoice.status == InvoiceStatus.skipped,
                    ),
            );
        }

        if (options.onlyNew && this.lastScrapeWithInvoices) {
            // options.yearFilter = DateTime.now().year;
            options.pageFilter = 1;
            this.logger.info(`Only invoices since order ${this.lastScrapeWithInvoices.number} will be gathered.`);
        }

        this.logger.debug(`Options: ${JSON.stringify(options, null, 4)}`);

        this.currentPage = await this.newPage();

        const { amazonSelectors, amazon } = this.getSelectors(options.tld);
        this.selectors = amazonSelectors;
        this.definition = amazon;

        const loginSuccessful = await login(this.currentPage, amazonSelectors, options, amazon, this.logger);
        if (!loginSuccessful) {
            this.logger.error(`Auth not successful. Exiting.`);
            return;
        }

        if (options.debug) {
            await this.currentPage.setViewport({
                width: 1920,
                height: 1080
            });
        }
        amazon.lang = await this.currentPage.$eval(`html`, el => el.lang);
        this.logger.debug(`Page language: ${amazon.lang}`);

        await this.goToOrderPage(amazon);

        this.possibleYears = await this.getPossibleYears(options.yearFilter);
        const processedOrders = await this.processYears();
        await this.endProcess(DateTime.now(), processedOrders, options);
    }

    private async goToOrderPage(amazon: AmazonDefinition): Promise<HTTPResponse> {
        this.logger.debug(`Going to order page...`);
        
        return await this.goToYear(DateTime.now().year, 0, amazon);
    }

    private async processYears(): Promise<Scrape[]> {
        this.logger.debug(`Processing years...`);

        const processedOrders = new Array<Scrape>();
        for (const currentYear of this.possibleYears) {

            if (currentYear != DateTime.now().year) {
                this.logger.info(`Selecting start year ${currentYear}`);
                await this.currentPage.select(`select[name="timeFilter"]`, `year-${currentYear}`);
                await this.currentPage.waitForNavigation({waitUntil: `domcontentloaded`});
                this.logger.debug(`Selected year ${currentYear}`);
            }

            this.logger.debug(`Determining pages...`);
            const orderPageCount = await this.getOrderPageCount();
            if (orderPageCount == null) {
                this.logger.error(`Couldn't get orderPageCount. Exiting.`);
                return;
            }

            for (const orderPage of [...Array(orderPageCount).keys()]) {
                this.logger.info(`Processing year "${currentYear}" page ${orderPage}`);
                const onlyNewInvoiceHandled = await this.processOrderPage(orderPage, processedOrders, orderPageCount, currentYear);
                if (onlyNewInvoiceHandled === true) {

                    return Promise.resolve(processedOrders);
                }
            }

            if (this.flags.yearFilter != currentYear) {
                this.logger.info(`Year "${currentYear}" done. Skipping to next year`);
            } else {
                this.logger.info(`Year "${currentYear}" done. Skipping next years`);

            }

            return Promise.resolve(processedOrders);
        }
    }

    private async processOrderPage(orderPage: number, processedOrders: Scrape[], orderPageCount: number, currentYear: number) {
        const amazonSelectors = this.selectors;
        const amazon = this.definition;

        this.logger.info(`Checking page ${orderPage} for orders`);
        const orderCards = await this.currentPage.$$(amazonSelectors.orderCards);
        this.logger.info(`Got ${orderCards.length} orders. Processing...`);

        let onlyNewInvoiceHandled = false;

        for (const [orderIndex, orderCard] of orderCards.entries()) {

            const { orderNumber, order } = await this.getOrder(orderCard);

            await this.clickInvoiceSpan(orderCard, orderIndex);

            const invoiceUrls = await this.getInvoiceUrls(orderIndex);

            if (this.flags.onlyNew && (orderNumber == this.lastScrapeWithInvoices?.number)) {
                this.logger.info(`Order ${orderNumber} already handled. Exiting.`);
                // await this.endProcess(DateTime.now(), processedOrders, this.flags);
                onlyNewInvoiceHandled = true;
            }

            order.invoices = this.getInvoices(invoiceUrls, orderIndex);
            processedOrders.push(order);
            this.logger.info(`Processing "${processedOrders.length}" orders`);

            if (this.flags.onlyNew && onlyNewInvoiceHandled) {
                break;
            }

            await this.getInvoiceDocumentsFromOrder(order);
        }

        if(onlyNewInvoiceHandled) {
            return true;
        }

        return await this.checkForLastPage(orderPage, orderPageCount, currentYear, amazon);
        
    }

    private async getOrderPageCount() {
        this.logger.debug(`Determining order pages...`);
        const amazonSelectors = this.selectors;
        let orderPageCount: number = null;

        try {
            orderPageCount = await (await this.currentPage.waitForSelector(amazonSelectors.pagination, { timeout: this.selectorWaitTimeout })).evaluate((handle: HTMLElement) => parseInt(handle.innerText));
            this.logger.info(`Determined order pages ${orderPageCount}`);
        } catch (ex) {
            orderPageCount = 1;
            this.logger.error(`Couldn't get orderPageCount ${orderPageCount} within ${this.selectorWaitTimeout}ms. Assume only one page.`);
        }
        this.logger.info(`Page count: ${orderPageCount}`);

        return orderPageCount;
    }

    private async checkForLastPage(orderPage: number, orderPageCount: number, currentYear: number, amazon: AmazonDefinition): Promise<boolean | HTTPResponse> {
        this.logger.debug(`Checking for last page...`);
        if ((orderPage) != orderPageCount) {
            if (this.flags.pageFilter != orderPage + 1) {
                this.logger.info(`Page "${orderPage}" done. Skipping to next page.`);
            } else {
                this.logger.info(`Page "${orderPage}" done. Skipping next pages`);
    
            }
            return await this.goToYear(currentYear, orderPage, amazon);
        } else {
            this.logger.info(`Last page "${orderPageCount}" reached. Going to next year.`);
            return false;
        }
    }

    private async goToYear(year: number, orderPage: number, amazon: AmazonDefinition): Promise<HTTPResponse> {
        this.logger.debug(`Going to year... ${year} order page ${orderPage}`);
        const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${year}&search=&startIndex=${10 * (orderPage)}`, amazon.orderPage);

        return await this.currentPage.goto(nextPageUrl.toString());
    }

    private async clickInvoiceSpan(orderCard: ElementHandle<Element>, orderIndex: number) {
        const amazonSelectors = this.selectors;
        const invoiceSpan = await orderCard.$(amazonSelectors.invoiceSpans);
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

    private async getInvoiceDocumentsFromOrder(order: Scrape) {
        this.logger.debug(`Getting invoice documents...`);
        for (const [invoiceIndex, invoice] of order.invoices.entries()) {
            const invoiceUrl = invoice.url;
            const pdfPage = await this.newPage();

            await pdfPage.goto(invoiceUrl);

            invoice.status = InvoiceStatus.opened;
            let fileReaderString: string;
            try {
                fileReaderString = await this.getFileReaderString(pdfPage, invoiceUrl);
            } catch (ex) {
                this.logger.error(`Error while fetching from url "${invoiceUrl}": ${ex.message}`);
            }
            const fileBuffer = this.getFileBuffer(fileReaderString, invoice, order, invoiceUrl);
            if (fileBuffer) {
                this.logger.debug(`Buffer exists`);
                this.logger.info(`Checking if folder exists. If not, create: ${this.flags.fileDestinationFolder}`);

                const { destPluginFileFolder, pathNormalized } = this.getPaths(invoiceUrl, order, invoiceIndex);

                this.writeFile(destPluginFileFolder, pathNormalized, invoice, fileBuffer, order);
            }
            this.logger.debug(`Closing invoice page`);
            await pdfPage.close();
        }
    }

    private async getPossibleYears(yearFilter: number): Promise<number[]> {
        this.logger.debug(`Getting possible years...`);
        const possibleYears = yearFilter ? [yearFilter] : await (await this.currentPage.$$eval(this.selectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
        const firstPossibleYear = possibleYears[0];
        const lastPossibleYear = possibleYears[possibleYears.length - 1];
        this.logger.debug(`Checking possible years. Got ${possibleYears}`);
        this.logger.info(`First possible year: ${firstPossibleYear}`);
        this.logger.info(`Last possible year: ${lastPossibleYear}`);
        return possibleYears;
    }

    private async getInvoiceUrls(orderIndex: number): Promise<string[]> {
        this.logger.debug(`Getting invoice urls...`);
        let invoiceList: ElementHandle<Element>;
        let invoiceUrls = new Array<string>();
        const amazonSelectors = this.selectors;
        const selectorWaitTimeout = this.selectorWaitTimeout;

        const popoverSelectorResolved = amazonSelectors.popover.replace(`{{index}}`, (orderIndex + 1).toString());
        try {
            const popover = await this.currentPage.waitForSelector(popoverSelectorResolved, { timeout: selectorWaitTimeout });
            this.logger.debug(`Got popover ${(orderIndex + 1)} -> ${popover}`);
            invoiceList = await popover.waitForSelector(amazonSelectors.invoiceList, { timeout: selectorWaitTimeout });
            invoiceUrls = await invoiceList.$$eval(amazonSelectors.invoiceLinks, (handles: Array<HTMLAnchorElement>) => handles.map(a => a.href));
            this.logger.debug(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
        } catch (ex) {
            this.logger.error(`Couldn't get popover ${popoverSelectorResolved} within ${selectorWaitTimeout}ms. Skipping`);
        }
        return invoiceUrls;
    }

    private async getOrder(orderCard: ElementHandle<Element>) {
        this.logger.debug(`Getting order...`);
        const amazonSelectors = this.selectors;
        const amazon = this.definition;
        const orderNumber: string = await orderCard.$eval(amazonSelectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());

        const orderDate = await orderCard.$eval(amazonSelectors.orderDate, (handle: HTMLElement) => handle.innerText);
        const orderDateLuxon = DateTime.fromFormat(orderDate, `DDD`, { locale: amazon.lang }).toISODate();
        const order: Scrape = {
            date: orderDateLuxon,
            datePlain: orderDate,
            invoices: [],
            number: orderNumber
        };

        this.logger.debug(`Got Order: ${orderNumber}`);
        this.logger.info(`Order date: ${orderDate}`);
        return { orderNumber, order };
    }

    private async endProcess(starttimestamp: DateTime, orders: Scrape[], options: AmazonOptions) {
        const endtimestamp = DateTime.now();
        const timeElapsed = endtimestamp.diff(starttimestamp, [`minutes`]);
        const invoiceCount = orders.reduce((prev, order) => prev + order.invoices.length, 0);
        this.logger.info(`Processing done. Processed ${invoiceCount} invoices in ${timeElapsed.minutes.toFixed(2)} minutes.`);
        if (options.debug) {
            await this.closeBrowser();
        }
        this.writeProcessFile(orders);

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
        const amazonSelectors: AmazonSelectors = {
            orderCards: `div.a-box-group.js-order-card`,
            invoiceSpans: `span.hide-if-no-js .a-declarative[data-action="a-popover"]`,
            orderNr: `.yohtmlc-order-id span:nth-last-child(1) bdi`,
            orderDate: `.order-info .a-box-inner .a-fixed-right-grid-col .a-column.a-span4 div:nth-last-child(1)`,
            popover: `#a-popover-content-{{index}}`,
            invoiceList: `ul.invoice-list`,
            invoiceLinks: `a[href*="invoice.pdf"]`,
            pagination: `ul.a-pagination li.a-normal:nth-last-child(2) a`,
            yearFilter: `select[name="timeFilter"] option`,
            authError: `#auth-error-message-box .a-unordered-list li`,
            authWarning: `#auth-warning-message-box .a-unordered-list li`,
            captchaImage: `div#image-captcha-section img#auth-captcha-image`
        };
        return { amazonSelectors, amazon };
    }

    private writeFile(destPluginFileFolder: string, pathNormalized: string, invoice: Invoice, fileBuffer: Buffer, order: Scrape) {
        if (!fs.existsSync(destPluginFileFolder)) {
            fs.mkdirSync(destPluginFileFolder, { recursive: true });
        }

        if (!fs.existsSync(pathNormalized)) {
            this.logger.debug(`Fullpath not exists: ${pathNormalized}`);
            try {
                this.logger.info(`Writing file: ${pathNormalized}`);
                invoice.status = InvoiceStatus.downloaded;
                fs.writeFileSync(pathNormalized, fileBuffer);
                invoice.status = InvoiceStatus.saved;
            } catch (err) {
                this.logger.error(err);
            }
        } else {
            this.logger.warn(`Invoice "${path.basename(pathNormalized)}" of order "${order.number}" already exists. Skipping file creation.`);
            invoice.status = InvoiceStatus.skipped;
        }
    }

    private getPaths(invoiceUrl: string, order: Scrape, invoiceIndex: number) {
        const destPluginFileFolder = path.resolve(path.join(this.flags.fileDestinationFolder, this.flags.subFolderForPages ? this.pluginName : ``, `/`), `./`);
        const fileExtention = path.extname(invoiceUrl).split(`?`)[0] ?? this.flags.fileFallbackExentension;
        const fileName = `${order.date}_AMZ_${order.number}_${invoiceIndex + 1}`;
        const fullFilePath = path.resolve(destPluginFileFolder, `${fileName}${fileExtention}`);
        const pathNormalized = path.normalize(fullFilePath);
        return { destPluginFileFolder, pathNormalized };
    }

    private getFileBuffer(fileReaderString: string, invoice: Invoice, order: Scrape, invoiceUrl: string): Buffer | null {
        if (!fileReaderString) {
            this.logger.error(`FileReaderString is empty returned from page for order "${order.number}" and url "${invoiceUrl}"`);
            return null;
        }
        const fileBuffer = Buffer.from(fileReaderString, `binary`);
        if (!fileBuffer) {
            this.logger.error(`Failed to create buffer from fileReader for order "${order.number}"`);
            return null;
        }
        invoice.status = InvoiceStatus.downloaded;
        this.logger.debug(`Created buffer from fileReader.`);
        return fileBuffer;
    }

    private async getFileReaderString(pdfPage, invoiceUrl: string): Promise<string> {
        return await pdfPage.evaluate(async (url) => {
            const response = await window.fetch(url, { mode: `no-cors` });
            const data = await response.blob();
            const reader = new FileReader();

            return new Promise<string>((resolve, reject) => {
                reader.readAsBinaryString(data);
                reader.onloadend = () => {
                    resolve(reader.result.toString());
                };
                reader.onerror = () => {
                    reject(reader.error);
                    return null;
                };
            });
        }, invoiceUrl);
    }
}
