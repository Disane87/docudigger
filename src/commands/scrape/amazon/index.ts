

import { Flags } from "@oclif/core";
import fs from "fs";
import { DateTime } from "luxon";
import path from "path";
import { InvoiceStatus } from "../../../enums/invoice-status.enum";
import { login } from "../../../helpers/auth.helper";
import { exit } from "../../../helpers/exit.helper";
import { parseBool } from "../../../helpers/parse-bool.helper";
import { AmazonOptions } from "../../../interfaces/amazon-options.interface";
import { AmazonDefinition } from "../../../interfaces/amazon.interface";
import { Invoice } from "../../../interfaces/invoice.interface";
import { Order } from "../../../interfaces/order.interface";
import { ProcessedOrders } from "../../../interfaces/processed-order.interface";
import { AmazonSelectors } from "../../../interfaces/selectors.interface";
import { ScrapeCommand } from "../../../classes/scrape-command.class";
import { Page } from "../../../classes/puppeteer.class";
import { ElementHandle } from "puppeteer";


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
        fileDestinationFolder: Flags.string({ aliases: [`fileDestinationFolder`], default: `./data/`, description: `Amazon top level domain`, env: `FILE_DESTINATION_FOLDER` }),
        fileFallbackExentension: Flags.string({ aliases: [`fileFallbackExentension`], default: `.pdf`, description: `Amazon top level domain`, env: `FILE_FALLBACK_EXTENSION` }),
        tld: Flags.string({ char: `t`, description: `Amazon top level domain`, default: `de`, env: `AMAZON_TLD` }),
        yearFilter: Flags.integer({ aliases: [`yearFilter`], description: `Filters a year`, env: `AMAZON_YEAR_FILTER` }),
        pageFilter: Flags.integer({ aliases: [`pageFilter`], description: `Filters a page`, env: `AMAZON_PAGE_FILTER` }),
        onlyNew: Flags.boolean({ aliases: [`onlyNew`], description: `Gets only new invoices`, env: `AMAZON_ONLY_NEW`, parse: parseBool }),
        subFolderForPages: Flags.boolean({ aliases: [`subFolderForPages`], description: `Creates subfolders for every scraped page/plugin`, env: `SUBFOLDER_FOR_PAGES`, parse: parseBool }),
    };

    // What is the meaning of life?

    public async run(): Promise<void> {
        const options: AmazonOptions = this.flags;

        const processJsonFile = path.resolve(path.join(`./`, `process.json`)).normalize();

        let processedOrders: ProcessedOrders = { lastRun: null, orders: [] };
        processedOrders = await this.getProcesedOrders(processJsonFile, processedOrders, options);

        this.logger.debug(`Options: ${JSON.stringify(options, null, 4)}`);

        const page = await this.newPage();

        const { amazonSelectors, amazon } = this.getSelectors(options.tld);

        const loginSuccessful = await login(page, amazonSelectors, options, amazon, this.logger);
        if (!loginSuccessful) {
            this.logger.error(`Auth not successful. Exiting.`);
            return;
        }

        if (options.debug) {
            await page.setViewport({
                width: 1920,
                height: 1080
            });
        }

        await this.goToOrderPage(amazon, page);

        // Get all orders
        const possibleYears = await this.getPossibleYears(options, page, amazonSelectors);

        const orders = new Array<Order>();
        const starttimestamp = DateTime.now();

        await this.processYears(possibleYears, page, options, amazonSelectors, this.selectorWaitTimeout, amazon, processedOrders, orders);

        await this.endProcess(starttimestamp, orders, options, processJsonFile);
    }

    private async goToOrderPage(amazon: AmazonDefinition, page: Page) {
        amazon.lang = await page.$eval(`html`, el => el.lang);
        this.logger.debug(`Page language: ${amazon.lang}`);
        await page.goto(amazon.orderPage, { waitUntil: `domcontentloaded` });
    }

    private async processYears(possibleYears: number[], page: Page, options: AmazonOptions, amazonSelectors: AmazonSelectors, selectorWaitTimeout: number, amazon: AmazonDefinition, processedOrders: { lastRun: Date; orders: Order[]; }, orders: Order[]) {
        for (const currentYear of possibleYears) {
            const orderPageCount = await this.getOrderPagecount(currentYear, page, options, amazonSelectors, selectorWaitTimeout);

            for (const orderPage of [...Array(orderPageCount).keys()]) {
                await this.processOrderPage(orderPage, page, amazonSelectors, amazon, selectorWaitTimeout, options, processedOrders, orders, orderPageCount, currentYear);
            }
            this.logger.info(`Year "${currentYear}" drone. Skipping to next year`);
        }
    }

    private async processOrderPage(orderPage: number, page: Page, amazonSelectors: AmazonSelectors, amazon: AmazonDefinition, selectorWaitTimeout: number, options: AmazonOptions, processedOrders: { lastRun: Date; orders: Order[]; }, orders: Order[], orderPageCount: number, currentYear: number) {
        this.logger.debug(`Checking page ${orderPage + 1} for orders`);
        const orderCards = await page.$$(amazonSelectors.orderCards);
        this.logger.info(`Got ${orderCards.length} orders. Processing...`);
        for (const [orderIndex, orderCard] of orderCards.entries()) {

            const { orderNumber, order } = await this.getOrder(orderCard, amazonSelectors, amazon);

            await this.clickInvoiceSpan(orderCard, amazonSelectors, orderIndex);

            const invoiceUrls = await this.getInvoiceUrls(amazonSelectors, orderIndex, page, selectorWaitTimeout);

            if (options.onlyNew && (orderNumber == processedOrders.orders[0]?.number)) {
                this.logger.info(`Order ${orderNumber} already handled. Exiting.`);
                break;
            }

            order.invoices = this.getInvoices(invoiceUrls, orderIndex);
            orders.push(order);
            this.logger.info(`Processing "${orders.length}" orders`);

            await this.getInvoiceDocumentsFromOrder(order, options);
        }
        const nextPageUrl = this.checkForLastPage(orderPage, orderPageCount, currentYear, amazon);
        if (nextPageUrl) {
            await page.goto(nextPageUrl);
        }
    }

    private async getOrderPagecount(currentYear: number, page, options: AmazonOptions, amazonSelectors: AmazonSelectors, selectorWaitTimeout: number) {
        this.logger.info(`Selecting start year ${currentYear}`);
        await page.select(`select[name="orderFilter"]`, `year-${currentYear}`);
        await page.waitForNavigation();
        this.logger.debug(`Selected year ${currentYear}`);
        this.logger.debug(`Determining pages...`);

        let orderPageCount: number = null;

        try {
            orderPageCount = options.pageFilter ?? await (await page.waitForSelector(amazonSelectors.pagination, { timeout: selectorWaitTimeout }))
                .evaluate((handle: HTMLElement) => parseInt(handle.innerText));
        } catch (ex) {
            orderPageCount = 1;
            this.logger.error(`Couldn't get orderPageCount ${orderPageCount} within ${selectorWaitTimeout}ms. Assume only one page.`);
        }
        this.logger.info(`Page count: ${orderPageCount}`);
        return orderPageCount;
    }

    private checkForLastPage(orderPage: number, orderPageCount: number, currentYear: number, amazon: AmazonDefinition): string | null {
        if ((orderPage + 1) != orderPageCount) {
            const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${currentYear}&search=&startIndex=${10 * (orderPage + 1)}`, amazon.orderPage);
            this.logger.info(`Page "${orderPage + 1}" done. Skipping to next page.`);
            this.logger.debug(`Nextpage url: ${nextPageUrl}`);
            return nextPageUrl.toString();
        } else {
            this.logger.info(`Last page "${orderPageCount}" reached. Going to next year.`);
            return null;
        }
    }

    private async clickInvoiceSpan(orderCard: ElementHandle<Element>, amazonSelectors: AmazonSelectors, orderIndex: number) {
        const invoiceSpan = await orderCard.$(amazonSelectors.invoiceSpans);
        invoiceSpan.click();
        this.logger.debug(`Checking popover ${orderIndex + 1}`);
    }

    private getInvoices(invoiceUrls: string[], orderIndex: number): Invoice[] {
        if (invoiceUrls.length == 0) {
            this.logger.warn(`No invoices found. Order may be undelivered. Check again later.`);
            return [];
        } else {
            const invoices: Array<Invoice> = invoiceUrls.map(invoiceUrl => ({ url: invoiceUrl, status: InvoiceStatus.determined } as Invoice));
            this.logger.info(`${invoices.length} invoices found 📃`);
            this.logger.debug(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
            return invoices;
        }
    }

    private async getInvoiceDocumentsFromOrder(order: Order, options: AmazonOptions) {
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
                this.logger.info(`Checking if folder exists. If not, create: ${options.fileDestinationFolder}`);

                const { destPluginFileFolder, pathNormalized } = this.getPaths(options, invoiceUrl, order, invoiceIndex);

                this.writeFile(destPluginFileFolder, pathNormalized, invoice, fileBuffer, order);
            }
            this.logger.debug(`Closing invoice page`);
            await pdfPage.close();
        }
    }

    private async getPossibleYears(options: AmazonOptions, page, amazonSelectors: AmazonSelectors): Promise<number[]> {
        const possibleYears = options.yearFilter ? [options.yearFilter] : await (await page.$$eval(amazonSelectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
        const firstPossibleYear = possibleYears[0];
        const lastPossibleYear = possibleYears[possibleYears.length - 1];
        this.logger.debug(`Checking possible years. Got ${possibleYears}`);
        this.logger.info(`First possible year: ${firstPossibleYear}`);
        this.logger.info(`Last possible year: ${lastPossibleYear}`);
        return possibleYears;
    }

    private async getInvoiceUrls(amazonSelectors: AmazonSelectors, orderIndex: number, page, selectorWaitTimeout: number): Promise<string[]> {
        let invoiceList: ElementHandle<Element>;
        let invoiceUrls = new Array<string>();
        const popoverSelectorResolved = amazonSelectors.popover.replace(`{{index}}`, (orderIndex + 1).toString());
        try {
            const popover = await page.waitForSelector(popoverSelectorResolved, { timeout: selectorWaitTimeout });
            this.logger.debug(`Got popover ${(orderIndex + 1)} -> ${popover}`);
            invoiceList = await popover.waitForSelector(amazonSelectors.invoiceList, { timeout: selectorWaitTimeout });
            invoiceUrls = await invoiceList.$$eval(amazonSelectors.invoiceLinks, (handles: Array<HTMLAnchorElement>) => handles.map(a => a.href));
            this.logger.debug(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
        } catch (ex) {
            this.logger.error(`Couldn't get popover ${popoverSelectorResolved} within ${selectorWaitTimeout}ms. Skipping`);
        }
        return invoiceUrls;
    }

    private async getOrder(orderCard: ElementHandle<Element>, amazonSelectors: AmazonSelectors, amazon: AmazonDefinition) {
        const orderNumber: string = await orderCard.$eval(amazonSelectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());

        const orderDate = await orderCard.$eval(amazonSelectors.orderDate, (handle: HTMLElement) => handle.innerText);
        const orderDateLuxon = DateTime.fromFormat(orderDate, `DDD`, { locale: amazon.lang }).toISODate();
        const order: Order = {
            date: orderDateLuxon,
            datePlain: orderDate,
            invoices: [],
            number: orderNumber
        };

        this.logger.debug(`Got Order: ${orderNumber}`);
        this.logger.info(`Order date: ${orderDate}`);
        return { orderNumber, order };
    }

    private async endProcess(starttimestamp: DateTime, orders: Order[], options: AmazonOptions, processJsonFile: string) {
        const endtimestamp = DateTime.now();
        const timeElapsed = endtimestamp.diff(starttimestamp, [`minutes`]);
        const invoiceCount = orders.reduce((prev, order) => prev + order.invoices.length, 0);
        this.logger.info(`Processing done. Processed ${invoiceCount} invoices in ${timeElapsed.minutes.toFixed(2)} minutes.`);
        if (options.debug) {
            await this.closeBrowser();
        }
        this.writeProcessFile(processJsonFile, orders);

        exit(this.logger, options.recurring);
    }

    private writeProcessFile(processJsonFile: string, orders: Order[]) {
        fs.writeFileSync(
            processJsonFile,
            JSON.stringify({ lastRun: DateTime.now().toISO(), orders }, null, 4)
        );
    }
    private getSelectors(tld: string): { amazonSelectors: AmazonSelectors, amazon: AmazonDefinition } {
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
            popover: `#a-popover-{{index}}`,
            invoiceList: `ul.invoice-list`,
            invoiceLinks: `a[href*=".pdf"]`,
            pagination: `.pagination-full ul.a-pagination li:nth-last-child(2) a`,
            yearFilter: `select[name="orderFilter"] option`,
            authError: `#auth-error-message-box .a-unordered-list li`,
            authWarning: `#auth-warning-message-box .a-unordered-list li`,
            captchaImage: `div#image-captcha-section img#auth-captcha-image`
        };
        return { amazonSelectors, amazon };
    }

    private writeFile(destPluginFileFolder: string, pathNormalized: string, invoice: Invoice, fileBuffer: Buffer, order: Order) {
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

    private getPaths(options: AmazonOptions, invoiceUrl: string, order: Order, invoiceIndex: number) {
        const destPluginFileFolder = path.resolve(path.join(options.fileDestinationFolder, options.subFolderForPages ? this.pluginName : ``, `/`), `./`);
        const fileExtention = path.extname(invoiceUrl).split(`?`)[0] ?? options.fileFallbackExentension;
        const fileName = `${order.date}_AMZ_${order.number}_${invoiceIndex + 1}`;
        const fullFilePath = path.resolve(destPluginFileFolder, `${fileName}${fileExtention}`);
        const pathNormalized = path.normalize(fullFilePath);
        return { destPluginFileFolder, pathNormalized };
    }

    private getFileBuffer(fileReaderString: string, invoice: Invoice, order: Order, invoiceUrl: string): Buffer | null {
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

    private async getProcesedOrders(processJsonFile: string, processedOrders: { lastRun: Date; orders: Order[]; }, options: AmazonOptions): Promise<ProcessedOrders> {
        if (fs.existsSync(processJsonFile)) {
            processedOrders = JSON.parse((await fs.promises.readFile(processJsonFile, `utf8`)));
            if (processedOrders.orders.length == 0) {
                this.logger.warn(`No latest orders. OnlyNew deactivated.`);
                options.onlyNew = false;
            }
        } else {
            this.logger.warn(`process.json not found. Full run needed. OnlyNew deactivated. `);
            options.onlyNew = false;
        }

        if (options.onlyNew) {
            options.yearFilter = DateTime.now().year;
            options.pageFilter = 1;
            this.logger.info(`Only invoices since order ${processedOrders.orders[0]?.number} will be gathered.`);
        }
        return processedOrders;
    }
}