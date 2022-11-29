import prompts from "prompts";
import puppeteer, { executablePath } from "puppeteer";
import winston from "winston";

import fs from "fs";
import path from "path";

import { DateTime } from "luxon";

(async () => {
    const fileDestinationFolder = `C:\\temp\\amazon\\`;
    const logPath = `./logs/`;
    const debug = true;
    const fallbackExtension = `.pdf`;

    const logger = winston.createLogger({
        level: `info`,
        format: winston.format.json(),
        // defaultMeta: { service: 'user-service' },
        transports: [
            new winston.transports.File({ filename: path.join(logPath, `error.log`), level: `error` }),
            new winston.transports.File({ filename: path.join(logPath, `combined.log`) }),
            new winston.transports.Console({
                level: `info`,
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                    winston.format.splat()
                )
            })
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

    const browser = await puppeteer.launch({ headless: !debug, args: [`--window-size=1920,1080`, `--no-sandbox`, `--disable-setuid-sandbox`], dumpio: false, executablePath: executablePath() });
    const page = await browser.newPage();

    const amazonLang = `de`;
    const amazon = {
        lang: amazonLang,
        loginPage: ``,
        orderPage: `https://www.amazon.de/gp/css/order-history`
    }

    const selectors = {
        orderCards: `div.a-box-group.js-order-card`,
        invoiceSpans: `span.hide-if-no-js .a-declarative[data-action="a-popover"]`,
        orderNr: `.yohtmlc-order-id span:nth-last-child(1) bdi`,
        orderDate: `.order-info .a-box-inner .a-fixed-right-grid-col .a-column.a-span4 div:nth-last-child(1)`,
        invoiceList: `.a-popover#a-popover-{{index}} ul.invoice-list a[href*=".pdf"]`
    }

    await page.goto(`https://www.amazon.${amazonLang}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`);
    await page.type(`input[type=email]`, name)
    await page.click(`input[type=submit]`)
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
        logger.info(`MFA detected`)
        const answer = await prompts({
            type: `text`,
            name: `otp`,
            message: `MFA detected. Enter your OTP token`
        })
        await page.type(`input#auth-mfa-otpcode`, answer.otp);
        await page.click(`input#auth-mfa-remember-device`)
        await page.click(`input[type=submit]`)

        await page.waitForNavigation();
    }

    await page.goto(amazon.orderPage, { waitUntil: `domcontentloaded` });

    //Increase for more results

    const possibleYears = await (await page.$$eval(`select[name="orderFilter"] option`, (handles: Array<HTMLOptionElement>) => handles.map(option => parseInt(option.innerText)))).filter(n => n);
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
        logger.info(`Selected year ${currentYear}`)

        // TODO Get pages
        logger.info(`Determining pages...`)
        const orderPageCount = await (await page.waitForSelector(`.pagination-full ul.a-pagination li:nth-last-child(2) a`)).evaluate(handle => parseInt(handle.innerText));
        logger.info(`Page count: ${orderPageCount}`);

        for (const orderPage of [...Array(orderPageCount).keys()]) {
            logger.info(`Checking page ${orderPage + 1} for orders`);
            const orderCards = await page.$$(selectors.orderCards);
            logger.info(`Got ${orderCards.length} orders. Processing...`);

            const orders = new Array<Order>();

            for (const [i, orderCard] of orderCards.entries()) {

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
                logger.debug(`Checking popover ${i + 1}`);
                await new Promise(r => setTimeout(r, 2000));

                const invoiceUrls = await page.$$eval(selectors.invoiceList.replace(`{{index}}`, (i + 1).toString()), (handles: Array<HTMLAnchorElement>) => handles.map(a => a.href));

                if (invoiceUrls.length == 0) {
                    logger.info(`No invoices found. Order may be undelivered. You have to wait 😐`)
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
                    const dlpage = await browser.newPage();

                    await dlpage.goto(invoiceUrl);

                    // async function getPdf() {
                    const fileReader = await page.evaluate(async url => {
                        return new Promise<string>(async (resolve, reject) => {
                            const reader = new FileReader();
                            const response = await window.fetch(url)
                            const data = await response.blob();

                            reader.readAsBinaryString(data);

                            reader.onload = () => resolve(reader.result.toString());
                            reader.onerror = reject;
                        })
                    }, invoiceUrl);

                    const pdfBuffer = Buffer.from(fileReader, `binary`);

                    if (pdfBuffer) {
                        !fs.existsSync(fileDestinationFolder) && fs.mkdirSync(fileDestinationFolder);
                        const fullFilePath = `${fileDestinationFolder}\\${order.datePlain.replace(`.`, ``).replace(` `, `_`)}_AMZ_${order.number}_${invoiceIndex + 1}${path.extname(invoiceUrl) ?? fallbackExtension}`;

                        if (!fs.existsSync(fullFilePath)) {
                            try {
                                fs.writeFile(fullFilePath, pdfBuffer, (err) => { if (err) throw err; });
                            } catch (err) {
                                logger.error(err);
                            }
                        } else {
                            logger.info(`Invoice ${path.basename(fullFilePath)} of order ${order.number} already exists. Skipping file creation.`)
                        }
                    }
                    await dlpage.close();
                }
            }

            if ((orderPage + 1) != orderPageCount) {
                const nextPageUrl = new URL(`?ie=UTF8&orderFilter=year-${currentYear}&search=&startIndex=${10 * (orderPage + 1)}`, amazon.orderPage);
                logger.info(`Page ${orderPage + 1} done. Skipping to next page.`);
                logger.info(`Nextpage url: ${nextPageUrl}`)
                await page.goto(nextPageUrl.toString())
            } else {
                logger.info(`Last page ${orderPageCount} reached. Going to next year.`);
            }

        }

        logger.info(`Year ${currentYear} drone. Skipping to next year`);
    }


})();

interface Order {
    date: DateTime;
    datePlain: string;
    number: string;
    invoiceUrls: Array<string>
}

interface ProcessedOrder {
    number: string;
    invoiceCount: number;

    savedInvoices: Array<string>
}