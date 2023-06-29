

import { Flags } from "@oclif/core";
import fs from "fs";
import { DateTime } from "luxon";
import path from "path";
import puppeteer, { ElementHandle, executablePath } from "puppeteer";
import { BaseCommand } from "../../../base.class";
import { InvoiceStatus } from "../../../enums/invoice-status.enum";
import { login } from "../../../helpers/auth.helper";
import { Invoice } from "../../../interfaces/invoice.interface";
import { Order } from "../../../interfaces/order.interface";
import { AmazonSelectors } from "../../../interfaces/selectors.interface";
import { parseBool } from "../../../helpers/parse-bool.helper";
import { exit } from "../../../helpers/exit.helper";


export default class Amazon extends BaseCommand<typeof Amazon> {
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
        sunFolderForPages: Flags.boolean({ aliases: [`sunFolderForPages`], description: `Creates subfolders for every scraped page/plugin`, env: `SUBFOLDER_FOR_PAGES`, parse: parseBool }),
    };

    public async run(): Promise<void> {

        // for (const [flag, value] of Object.entries(this.flags)) {
        //     this.log(`${flag}: ${value}`);
        // }
        const options = this.flags;

        const puppeteerArgs = [`--window-size=1920,1080`, `--no-sandbox`, `--disable-setuid-sandbox`];
        const selectorWaitTimeout = 2000;
        const processJsonFile = path.resolve(path.join(`./`, `process.json`)).normalize();

        let processedOrders: { lastRun: Date, orders: Order[] } = { lastRun: null, orders: [] };
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

        this.logger.debug(`Options: ${JSON.stringify(options, null, 4)}`);
        const browser = await puppeteer.launch({ headless: `new`, args: puppeteerArgs, dumpio: false, devtools: options.debug, executablePath: executablePath() });
        const page = await browser.newPage();
        const amazon = {
            lang: null,
            tld: options.tld,
            loginPage: `https://www.amazon.${options.tld}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`,
            orderPage: `https://www.amazon.${options.tld}/gp/css/order-history`
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
        const loginSuccessful = await login(page, amazonSelectors, options, amazon, browser, this.logger);
        if (!loginSuccessful) {
            this.logger.error(`Auth not successful. Exiting.`);
            return;
        }
        // await page.type(`input[type=password]`, options.amazonPassword);
        // await page.click(`input[type=submit]`);
        // await page.on('console', code => console.log(code.text()));
        if (options.debug) {
            await page.setViewport({
                width: 1920,
                height: 1080
            });
        }
        amazon.lang = await page.$eval(`html`, el => el.lang);
        this.logger.debug(`Page language: ${amazon.lang}`);
        await page.goto(amazon.orderPage, { waitUntil: `domcontentloaded` });
        const possibleYears = options.yearFilter ? [options.yearFilter] : await (await page.$$eval(amazonSelectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
        const firstPossibleYear = possibleYears[0];
        const lastPossibleYear = possibleYears[possibleYears.length - 1];
        this.logger.debug(`Checking possible years. Got ${possibleYears}`);
        this.logger.info(`First possible year: ${firstPossibleYear}`);
        this.logger.info(`Last possible year: ${lastPossibleYear}`);
        const orders = new Array<Order>();
        const starttimestamp = DateTime.now();
        for (const currentYear of possibleYears) {
            this.logger.info(`Selecting start year ${currentYear}`);
            await page.select(`select[name="orderFilter"]`, `year-${currentYear}`);
            await page.waitForNavigation();
            this.logger.debug(`Selected year ${currentYear}`);
            this.logger.debug(`Determining pages...`);
            let orderPageCount: number = null;
            try {
                orderPageCount = options.pageFilter ?? await (await page.waitForSelector(amazonSelectors.pagination, { timeout: selectorWaitTimeout })).evaluate((handle: HTMLElement) => parseInt(handle.innerText));
            } catch (ex) {
                orderPageCount = 1;
                this.logger.error(`Couldn't get orderPageCount ${orderPageCount} within ${selectorWaitTimeout}ms. Assume only one page.`);
            }
            this.logger.info(`Page count: ${orderPageCount}`);
            for (const orderPage of [...Array(orderPageCount).keys()]) {
                this.logger.debug(`Checking page ${orderPage + 1} for orders`);
                const orderCards = await page.$$(amazonSelectors.orderCards);
                this.logger.info(`Got ${orderCards.length} orders. Processing...`);
                for (const [orderIndex, orderCard] of orderCards.entries()) {
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
                    const invoiceSpan = await orderCard.$(amazonSelectors.invoiceSpans);
                    invoiceSpan.click();
                    this.logger.debug(`Checking popover ${orderIndex + 1}`);
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

                    if (options.onlyNew && (orderNumber == processedOrders.orders[0]?.number)) {
                        this.logger.info(`Order ${orderNumber} already handled. Exiting.`);
                        // exit(this.logger, options.recurring);
                        return;
                    }

                    if (invoiceUrls.length == 0) {
                        this.logger.warn(`No invoices found. Order may be undelivered. Check again later.`);
                    } else {
                        const invoices: Array<Invoice> = invoiceUrls.map(invoiceUrl => ({ url: invoiceUrl, status: InvoiceStatus.determined } as Invoice));
                        order.invoices = invoices;
                        this.logger.info(`${invoices.length} invoices found 📃`);
                        this.logger.debug(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
                    }
                    orders.push(order);
                    this.logger.info(`Processing "${orders.length}" orders`);
                    for (const [invoiceIndex, invoice] of order.invoices.entries()) {
                        const invoiceUrl = invoice.url;
                        const pdfPage = await browser.newPage();
                        await pdfPage.goto(invoiceUrl);
                        invoice.status = InvoiceStatus.opened;
                        let fileReaderString: string;
                        try {
                            fileReaderString = await pdfPage.evaluate(async url => {
                                return new Promise<string>(async (resolve, reject) => {
                                    // eslint-disable-next-line no-debugger
                                    // console.log(`--- [AMZ SCRAPER] Reading: ${url} ---`);
                                    const reader = new FileReader();
                                    const response = await window.fetch(url, { mode: `no-cors` });
                                    const data = await response.blob();
                                    reader.readAsBinaryString(data);
                                    // console.log(`[AMZ SCRAPER] Reader result: ${reader.result}`);
                                    // console.log(`[AMZ SCRAPER] Reader ready state: ${reader.readyState}`);
                                    reader.onloadend = () => {
                                        resolve(reader.result.toString());
                                    };
                                    reader.onerror = () => {
                                        // console.log(`[AMZ SCRAPER] onerror`);
                                        // console.log(`[AMZ SCRAPER] Reader result: ${reader.result}`);
                                        // console.log(`[AMZ SCRAPER] Reader ready state: ${reader.readyState}`);
                                        // console.log(`[AMZ SCRAPER] Reader error: ${reader.error.message}`);
                                        // console.log(`--- [AMZ SCRAPER] Reading: ${url} ENDED ---`);
                                        reject(reader.error);
                                        return null;
                                    };
                                });
                            }, invoiceUrl);
                        } catch (ex) {
                            this.logger.error(`Error while fetching from url "${invoiceUrl}": ${ex.message}`);
                        }
                        let fileBuffer: Buffer = null;
                        if (fileReaderString) {
                            fileBuffer = Buffer.from(fileReaderString, `binary`);
                            if (fileBuffer) {
                                invoice.status = InvoiceStatus.downloaded;
                                this.logger.debug(`Created buffer from fileReader.`);
                            } else {
                                this.logger.error(`Failed to create buffer from fileReader for order "${order.number}"`);
                            }
                        } else {
                            this.logger.error(`FileReaderString is empty returned from page for order "${order.number}" and url "${invoiceUrl}"`);
                        }
                        if (fileBuffer) {
                            this.logger.debug(`Buffer exists`);
                            this.logger.info(`Checking if folder exists. If not, create: ${options.fileDestinationFolder}`);

                            const destPluginFileFolder = path.resolve(path.join(options.fileDestinationFolder, options.sunFolderForPages ? this.pluginName : ``, `/`), `./`);
                            const fileExtention = path.extname(invoiceUrl).split(`?`)[0] ?? options.fileFallbackExentension;
                            const fileName = `${order.date}_AMZ_${order.number}_${invoiceIndex + 1}`;
                            const fullFilePath = path.resolve(destPluginFileFolder, `${fileName}${fileExtention}`);
                            const pathNormalized = path.normalize(fullFilePath);
                            
                            if(!fs.existsSync(destPluginFileFolder)){
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
                        this.logger.debug(`Closing invoice page`);
                        await pdfPage.close();
                    }
                }
                if ((orderPage + 1) != orderPageCount) {
                    const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${currentYear}&search=&startIndex=${10 * (orderPage + 1)}`, amazon.orderPage);
                    this.logger.info(`Page "${orderPage + 1}" done. Skipping to next page.`);
                    this.logger.debug(`Nextpage url: ${nextPageUrl}`);
                    await page.goto(nextPageUrl.toString());
                } else {
                    this.logger.info(`Last page "${orderPageCount}" reached. Going to next year.`);
                }
            }
            this.logger.info(`Year "${currentYear}" drone. Skipping to next year`);
        }
        const endtimestamp = DateTime.now();
        const timeElapsed = endtimestamp.diff(starttimestamp, [`minutes`]);
        const invoiceCount = orders.reduce((prev, order) => prev + order.invoices.length, 0);
        this.logger.info(`Processing done. Processed ${invoiceCount} invoices in ${timeElapsed.minutes.toFixed(2)} minutes.`);
        if (options.debug) {
            await browser.close();
        }
        fs.writeFileSync(
            processJsonFile,
            JSON.stringify({ lastRun: DateTime.now().toISO(), orders }, null, 4)
        );

        exit(this.logger,options.recurring);
    }
}
