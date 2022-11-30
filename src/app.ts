import prompts from "prompts";
import puppeteer, { ElementHandle, executablePath } from "puppeteer";
import winston from "winston";

import fs from "fs";
import path from "path";

import { DateTime } from "luxon";
import { LogLevel } from "./enums/loglevel";
import { Order } from "./interfaces/order";
import { ProcessedOrder } from "./interfaces/processed-order";

(async () => {
    const fileDestinationFolder = `./data`;
    const logPath = `./logs/`;
    const debug = true;
    const fallbackExtension = `.pdf`;
    const yearFilter = 2017;
    const pageFilter = 1;
    const logLevel: string = debug ? LogLevel.debug : LogLevel.trace;
    const popoverTimeout = 2000;

    const logger = winston.createLogger({
        level: logLevel.toString(),
        format: winston.format.json(),
        // defaultMeta: { service: 'user-service' },
        transports: [
            new winston.transports.File({ filename: path.join(logPath, `error.log`), level: `error` }),
            new winston.transports.File({ filename: path.join(logPath, `combined.log`) }),
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.splat()
                )
            }),
        ],
    });

    const { name, password } = await prompts([{
        type: `text`,
        name: `name`,
        message: `Your amazaon username`
    },
    {
        type: `password`,
        name: `password`,
        message: `Your amazon password`
    }]);

    const browser = await puppeteer.launch({ headless: !debug, args: [`--window-size=1920,1080`, `--no-sandbox`, `--disable-setuid-sandbox`], dumpio: false, devtools: debug, executablePath: executablePath() });
    const page = await browser.newPage();

    const amazonLang = `de`;
    const amazon = {
        lang: amazonLang,
        loginPage: ``,
        orderPage: `https://www.amazon.de/gp/css/order-history`
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

    await page.goto(`https://www.amazon.${amazonLang}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`);
    await page.type(`input[type=email]`, name);
    await page.click(`input[type=submit]`);
    await page.waitForNavigation();
    await page.type(`input[type=password]`, password);
    await page.click(`input[type=submit]`);
    // await page.on('console', code => console.log(code.text()));

    await page.setViewport({
        width: 1920,
        height: 1080
    });

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


    await page.goto(amazon.orderPage, { waitUntil: `domcontentloaded` });

    //Increase for more results
    const possibleYears = yearFilter ? [yearFilter] : await (await page.$$eval(selectors.yearFilter, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
    const firstPossibleYear = possibleYears[0];
    const lastPossibleYear = possibleYears[possibleYears.length - 1];

    logger.info(`Checking possible years. Got ${possibleYears}`);
    logger.info(`First possible year: ${firstPossibleYear}`);
    logger.info(`Last possible year: ${lastPossibleYear}`);


    const processedOrders = new Array<ProcessedOrder>();

    for (const currentYear of possibleYears) {
        logger.info(`Selecting start year ${currentYear}`);
        await page.select(`select[name="orderFilter"]`, `year-${currentYear}`);
        await page.waitForNavigation();
        logger.info(`Selected year ${currentYear}`);

        // TODO Get pages
        logger.info(`Determining pages...`);
        const orderPageCount = pageFilter ?? await (await page.waitForSelector(selectors.pagination)).evaluate((handle: HTMLElement) => parseInt(handle.innerText));
        logger.info(`Page count: ${orderPageCount}`);

        for (const orderPage of [...Array(orderPageCount).keys()]) {
            logger.info(`Checking page ${orderPage + 1} for orders`);
            const orderCards = await page.$$(selectors.orderCards);
            logger.info(`Got ${orderCards.length} orders. Processing...`);

            const orders = new Array<Order>();

            for (const [orderIndex, orderCard] of orderCards.entries()) {

                const orderNumber: string = await orderCard.$eval(selectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());
                // const currentOrder: Partial<ProcessedOrder> = {
                //     number: orderNumber
                // }


                const orderDate = await orderCard.$eval(selectors.orderDate, (handle: HTMLElement) => handle.innerText);
                const orderDateLuxon = DateTime.fromFormat(orderDate, `DATE_FULL`, { locale: `de` });

                logger.info(`Got Order: ${orderNumber}`);
                logger.info(`Order date: ${orderDate}`);


                const invoiceSpan = await orderCard.$(selectors.invoiceSpans);

                invoiceSpan.click();
                logger.debug(`Checking popover ${orderIndex + 1}`);
                // await new Promise(r => setTimeout(r, popoverTimeout));

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
                    // currentOrder.invoiceCount = 0;
                } else {
                    orders.push({ date: orderDateLuxon, number: orderNumber, invoiceUrls, datePlain: orderDate });
                    logger.info(`Invoices found 🔫`, invoiceUrls);
                    // currentOrder.invoiceCount = invoiceUrls.length;
                }

            }

            logger.info(`Processing ${orders.length} orders`);

            for (const order of orders) {
                for (const [invoiceIndex, invoiceUrl] of order.invoiceUrls.entries()) {
                    if (invoiceUrl.indexOf(`https://s3.amazonaws.com/`) >= -1) {
                        logger.warn(`Invoice stored at S3 are not supported yet`);
                        continue;
                    }

                    let fileReaderString: string;
                    try {
                        fileReaderString = await page.evaluate(async url => {
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
                            logger.debug(`Created buffer from fileReader. Filereade is null`);
                        } else {
                            logger.error(`Failed to create buffer from fileReader for order "${order.number}"`);
                        }
                    } else {
                        logger.error(`FileReaderString is empty returned from page for order "${order.number}" and url "${invoiceUrl}"`);
                    }


                    if (fileBuffer) {
                        logger.debug(`Buffer exists`);
                        logger.debug(`Checking if folder exists. If not, create: ${fileDestinationFolder}`);
                        !fs.existsSync(fileDestinationFolder) && fs.mkdirSync(fileDestinationFolder);
                        const fullFilePath = path.join(fileDestinationFolder, `${order.datePlain.replace(`.`, ``).replace(` `, `_`)}_AMZ_${order.number}_${invoiceIndex + 1}${path.extname(invoiceUrl) ?? fallbackExtension}`);

                        const pathNormalized = path.normalize(fullFilePath);
                        if (!fs.existsSync(pathNormalized)) {
                            logger.debug(`Fullpath not exists: ${pathNormalized}`);
                            try {
                                logger.info(`Writing file: ${pathNormalized}`);
                                fs.writeFile(pathNormalized, fileBuffer, (err) => { if (err) throw err; });
                            } catch (err) {
                                logger.error(err);
                            }
                        } else {
                            logger.info(`Invoice ${path.basename(pathNormalized)} of order ${order.number} already exists. Skipping file creation.`);
                        }
                    }

                    // logger.debug(`Closing page`);
                    // await dlpage.close();
                }
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
    // await browser.close();

})();