import prompts from "prompts";
import puppeteer, { ElementHandle, executablePath } from "puppeteer";
import winston from "winston";

import fs from "fs";
import path from "path";

import { DateTime } from "luxon";
import { InvoiceStatus } from "./enums/invoice-status.enum";
import { Invoice } from "./interfaces/invoice";
import { Order } from "./interfaces/order";

import { Command } from 'commander';
import { config } from './config';

const program = new Command();

(async () => {

    const puppeteerArgs = [`--window-size=1920,1080`, `--no-sandbox`, `--disable-setuid-sandbox`];
    const popoverTimeout = 2000;

    program
        .option(`-d, --debug true/false`, `Execute in debug mode`, config.debug)
        .option(`-fbe, --fallback-exentension string`, `Fallback extension when extension can't be determinded by the url`, config.fileFallbackExentension)
        .option(`-dest, --destination`, `Destination folder where the downloaded files are stored`, config.fileDestinationFolder)
        .option(`-y, --year-filter int`, `Specify a year to only process it`, config.yearFilter)
        .option(`-p, --page-filter int`, `Specify a page to only process it`, config.pageFilter)
        .option(`-atld, --amazon-tld string`, `Amazon TLD to use`, config.amazonTLD)
        .option(`-l, --log-level string`, `Amazon TLD to use. Depends on --debug`, config.logLevel)
        .option(`-lp, --log-path string`, `Path where the log files are stored`, config.logPath)
        .requiredOption(`-u, --username`, `Amazon username to use.`, config.amazonUsername)
        .requiredOption(`-p, --password`, `Amazon password to use.`, config.amazonPassword)
        .parse();

    const options = program.opts();

    const logger = winston.createLogger({
        level: options.logLevel.toString(),
        format: winston.format.json(),
        // defaultMeta: { service: 'user-service' },
        transports: [
            new winston.transports.File({ filename: path.join(options.logPath, `error.log`).normalize(), level: `error` }),
            new winston.transports.File({ filename: path.join(options.logPath, `combined.log`).normalize() }),
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.splat()
                )
            }),
        ],
    });

    if (!config.amazonUsername && !config.amazonPassword) {
        const { username, password } = await prompts([{
            type: `text`,
            name: `username`,
            message: `Your amazaon username`
        },
        {
            type: `password`,
            name: `password`,
            message: `Your amazon password`
        }]);

        options.password = password;
        options.username = username;
    }


    const browser = await puppeteer.launch({ headless: !options.debug, args: puppeteerArgs, dumpio: false, devtools: options.debug, executablePath: executablePath() });
    const page = await browser.newPage();

    const amazon = {
        lang: null,
        tld: options.amazonTld,
        loginPage: `https://www.amazon.${options.amazonTld}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`,
        orderPage: `https://www.amazon.${options.amazonTld}/gp/css/order-history`
    };

    const selectors = {
        orderCards: `div.a-box-group.js-order-card`,
        invoiceSpans: `span.hide-if-no-js .a-declarative[data-action="a-popover"]`,
        orderNr: `.yohtmlc-order-id span:nth-last-child(1) bdi`,
        orderDate: `.order-info .a-box-inner .a-fixed-right-grid-col .a-column.a-span4 div:nth-last-child(1)`,
        popover: `#a-popover-{{index}}`,
        invoiceList: `ul.invoice-list`,
        invoiceLinks: `a[href*=".pdf"]`,
        pagination: `.pagination-full ul.a-pagination li:nth-last-child(2) a`,
        yearFilter: `select[name="orderFilter"] option`
    };

    logger.debug(`Selectors: ${selectors}`);

    await page.goto(amazon.loginPage);

    await page.type(`input[type=email]`, options.username);
    await page.click(`input[type=submit]`);
    await page.waitForNavigation();
    await page.type(`input[type=password]`, options.password);
    await page.click(`input[type=submit]`);
    // await page.on('console', code => console.log(code.text()));

    if (options.debug) {
        await page.setViewport({
            width: 1920,
            height: 1080
        });
    }

    await page.waitForNavigation();
    if (page.url().indexOf(`/mfa?`) > -1) {
        logger.info(`MFA detected`);
        const answer = await prompts({
            type: `text`,
            name: `otp`,
            message: `MFA detected. Enter your OTP token`
        });
        await page.type(`input#auth-mfa-otpcode`, answer.otp);
        await page.click(`input#auth-mfa-remember-device`);
        await page.click(`input[type=submit]`);

        await page.waitForNavigation();
    }

    amazon.lang = await page.$eval(`html`, el => el.lang);
    logger.info(`Page language: ${amazon.lang}`);

    await page.goto(amazon.orderPage, { waitUntil: `domcontentloaded` });

    const possibleYears = options.yearFilter ? [options.yearFilter] : await (await page.$$eval(selectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
    const firstPossibleYear = possibleYears[0];
    const lastPossibleYear = possibleYears[possibleYears.length - 1];

    logger.info(`Checking possible years. Got ${possibleYears}`);
    logger.info(`First possible year: ${firstPossibleYear}`);
    logger.info(`Last possible year: ${lastPossibleYear}`);


    const orders = new Array<Order>();

    for (const currentYear of possibleYears) {
        logger.info(`Selecting start year ${currentYear}`);
        await page.select(`select[name="orderFilter"]`, `year-${currentYear}`);
        await page.waitForNavigation();
        logger.info(`Selected year ${currentYear}`);

        logger.info(`Determining pages...`);
        const orderPageCount = options.pageFilter ?? await (await page.waitForSelector(selectors.pagination)).evaluate((handle: HTMLElement) => parseInt(handle.innerText));
        logger.info(`Page count: ${orderPageCount}`);

        for (const orderPage of [...Array(orderPageCount).keys()]) {
            logger.info(`Checking page ${orderPage + 1} for orders`);
            const orderCards = await page.$$(selectors.orderCards);
            logger.info(`Got ${orderCards.length} orders. Processing...`);

            for (const [orderIndex, orderCard] of orderCards.entries()) {

                const orderNumber: string = await orderCard.$eval(selectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());

                const orderDate = await orderCard.$eval(selectors.orderDate, (handle: HTMLElement) => handle.innerText);
                const orderDateLuxon = DateTime.fromFormat(orderDate, `DDD`, { locale: amazon.lang }).toISODate();

                const order: Order = {
                    date: orderDateLuxon,
                    datePlain: orderDate,
                    invoices: [],
                    number: orderNumber
                };

                logger.info(`Got Order: ${orderNumber}`);
                logger.info(`Order date: ${orderDate}`);


                const invoiceSpan = await orderCard.$(selectors.invoiceSpans);

                invoiceSpan.click();
                logger.debug(`Checking popover ${orderIndex + 1}`);

                let invoiceList: ElementHandle<Element>;
                let invoiceUrls = new Array<string>();
                const popoverSelectorResolved = selectors.popover.replace(`{{index}}`, (orderIndex + 1).toString());
                try {

                    const popover = await page.waitForSelector(popoverSelectorResolved, { timeout: popoverTimeout });
                    logger.info(`Got popover ${(orderIndex + 1)} -> ${popover}`);

                    invoiceList = await popover.waitForSelector(selectors.invoiceList);
                    invoiceUrls = await invoiceList.$$eval(selectors.invoiceLinks, (handles: Array<HTMLAnchorElement>) => handles.map(a => a.href));

                    logger.info(`Got invoiceUrls ${(orderIndex + 1)} -> ${invoiceUrls}`);
                } catch (ex) {
                    logger.error(`Couldn't get popover ${popoverSelectorResolved} within ${popoverTimeout}ms. Skipping`);
                }

                if (invoiceUrls.length == 0) {
                    logger.info(`No invoices found. Order may be undelivered. You have to wait 😐`);
                } else {
                    const invoices: Array<Invoice> = invoiceUrls.map(invoiceUrl => ({ url: invoiceUrl, status: InvoiceStatus.determined } as Invoice));
                    order.invoices = invoices;
                    logger.info(`Invoices found 🔫`, invoiceUrls);
                }
                orders.push(order);
            }

            if ((orderPage + 1) != orderPageCount) {
                const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${currentYear}&search=&startIndex=${10 * (orderPage + 1)}`, amazon.orderPage);
                logger.info(`Page ${orderPage + 1} done. Skipping to next page.`);
                logger.info(`Nextpage url: ${nextPageUrl}`);
                await page.goto(nextPageUrl.toString());
            } else {
                logger.info(`Last page ${orderPageCount} reached. Going to next year.`);
            }

        }

        logger.info(`Year ${currentYear} drone. Skipping to next year`);
    }

    logger.info(`Processing ${orders.length} orders`);

    for (const order of orders) {
        for (const [invoiceIndex, invoice] of order.invoices.entries()) {
            // if (invoiceUrl.includes(`https://s3.amazonaws.com/`)) {
            //     logger.warn(`Invoices stored at S3 are not supported yet. Invoice: ${invoiceUrl}`);
            //     continue;
            // }

            const invoiceUrl = invoice.url;

            const pdfPage = await browser.newPage();
            await pdfPage.goto(invoiceUrl);
            invoice.status = InvoiceStatus.opened;

            let fileReaderString: string;
            try {
                fileReaderString = await pdfPage.evaluate(async url => {
                    return new Promise<string>(async (resolve, reject) => {
                        // eslint-disable-next-line no-debugger
                        console.log(`--- [AMZ SCRAPER] Reading: ${url} ---`);
                        const reader = new FileReader();
                        const response = await window.fetch(url, { mode: `no-cors` });
                        const data = await response.blob();

                        reader.readAsBinaryString(data);

                        console.log(`[AMZ SCRAPER] Reader result: ${reader.result}`);
                        console.log(`[AMZ SCRAPER] Reader ready state: ${reader.readyState}`);

                        reader.onloadend = () => {

                            resolve(reader.result.toString());
                        };

                        reader.onerror = (event) => {
                            console.log(`[AMZ SCRAPER] onerror`);
                            console.log(`[AMZ SCRAPER] Reader result: ${reader.result}`);
                            console.log(`[AMZ SCRAPER] Reader ready state: ${reader.readyState}`);
                            console.log(`[AMZ SCRAPER] Reader error: ${reader.error.message}`);
                            console.log(`--- [AMZ SCRAPER] Reading: ${url} ENDED ---`);
                            reject(reader.error);
                            return null;
                        };
                    });
                }, invoiceUrl);
            } catch (ex) {
                logger.error(`Error while fetching from url "${invoiceUrl}": ${ex.message}`);
            }


            let fileBuffer: Buffer;
            if (fileReaderString) {
                fileBuffer = Buffer.from(fileReaderString, `binary`);
                if (fileBuffer) {
                    invoice.status = InvoiceStatus.downloaded;
                    logger.debug(`Created buffer from fileReader.`);
                } else {
                    logger.error(`Failed to create buffer from fileReader for order "${order.number}"`);
                }
            } else {
                logger.error(`FileReaderString is empty returned from page for order "${order.number}" and url "${invoiceUrl}"`);
            }


            if (fileBuffer) {
                logger.debug(`Buffer exists`);
                logger.debug(`Checking if folder exists. If not, create: ${options.fileDestinationFolder}`);
                !fs.existsSync(options.fileDestinationFolder) && fs.mkdirSync(options.fileDestinationFolder);

                const fileExtention = path.extname(invoiceUrl).split(`?`)[0] ?? options.fallbackExtension;
                const fileName = `${order.datePlain.replace(`.`, ``).replace(` `, `_`)}_AMZ_${order.number}_${invoiceIndex + 1}`;
                const fullFilePath = path.join(options.fileDestinationFolder, `${fileName}${fileExtention}`);

                const pathNormalized = path.normalize(fullFilePath);
                if (!fs.existsSync(pathNormalized)) {
                    logger.debug(`Fullpath not exists: ${pathNormalized}`);
                    try {
                        logger.info(`Writing file: ${pathNormalized}`);
                        invoice.status = InvoiceStatus.downloaded;
                        fs.writeFileSync(pathNormalized, fileBuffer);
                        invoice.status = InvoiceStatus.saved;
                    } catch (err) {
                        logger.error(err);
                    }
                } else {
                    logger.info(`Invoice ${path.basename(pathNormalized)} of order ${order.number} already exists. Skipping file creation.`);
                    invoice.status = InvoiceStatus.skipped;
                }
            }

            logger.debug(`Closing page`);
            await pdfPage.close();
        }
    }
    await browser.close();

    fs.writeFileSync(
        path.join(options.fileDestinationFolder, `process.json`).normalize(),
        JSON.stringify({ lastRun: DateTime.now().toISO(), orders }, null, 4)
    );

})();