import prompts from 'prompts';
import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import UserPreferencesPlugin from 'puppeteer-extra-plugin-user-preferences';

import fs from 'fs';
import path from 'path';

import { DateTime } from 'luxon';

(async () => {

    //  devtools: true, userDataDir: './data',

    const { name, password } = await prompts([{
        type: 'text',
        name: 'name',
        message: 'Your amazaon username'
    },
    {
        type: 'password',
        name: 'password',
        message: 'Your amazon password'
    }]);

    const browser = await puppeteer.launch({ headless: false, args: ["--window-size=1920,1080", '--no-sandbox', '--disable-setuid-sandbox'], dumpio: false, executablePath: executablePath() });
    const page = await browser.newPage();

    // https://github.com/puppeteer/puppeteer/issues/4736
    await puppeteer.use(UserPreferencesPlugin({
        userPrefs: {
            download: {
                prompt_for_download: false,
                directory_upgrade: true,
                default_directory: path.join("C:\\temp\\"),
                extensions_to_open: "applications/pdf",
            },
            plugins: {
                always_open_pdf_externally: true,
                plugins_disabled: ["Chrome PDF Viewer"],
            },
        }
    }));

    const amazonLang = "de";
    const amazon = {
        lang: 'de',
        loginPage: '',
        orderPage: 'https://www.amazon.de/gp/css/order-history?ref_=nav_AccountFlyout_orders'
    }

    const selectors = {
        orderCards: 'div.a-box-group.js-order-card',
        invoiceSpans: 'span.hide-if-no-js .a-declarative[data-action="a-popover"]',
        orderNr: '.yohtmlc-order-id span:nth-last-child(1) bdi',
        orderDate: '.order-info .a-box-inner .a-fixed-right-grid-col .a-column.a-span4 div:nth-last-child(1)',
        invoiceList: '.a-popover#a-popover-{{index}} ul.invoice-list a[href$=".pdf"]'
    }


    const download = (content: Buffer, extension: string, destDirectory: string, name: string) => {

        const fileName = [name, extension].join('');
        const filePath = path.join(destDirectory, fileName);

        !fs.existsSync(destDirectory) && fs.mkdirSync(destDirectory);

        try {
            fs.writeFileSync(filePath, content);
            // file written successfully
        } catch (err) {
            console.error(err);
        }

    }

    await page.goto(`https://www.amazon.${amazonLang}/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&`);
    await page.type("input[type=email]", name)
    await page.click("input[type=submit]")
    await page.waitForNavigation();
    await page.type("input[type=password]", password);
    await page.click("input[type=submit]");
    await page.on('console', code => console.log(code.text()));

    await page.setViewport({
        width: 1920,
        height: 1080
    });

    await page.waitForNavigation();
    if (page.url().indexOf("/mfa?") > -1) {
        console.log("MFA detected")
        const answer = await prompts({
            type: 'text',
            name: 'otp',
            message: 'MFA detected. Enter your OTP token'
        })
        await page.type("input#auth-mfa-otpcode", answer.otp);
        await page.click("input#auth-mfa-remember-device")
        await page.click("input[type=submit]")

        await page.waitForNavigation();
    }

    await page.goto(amazon.orderPage, { waitUntil: 'domcontentloaded' });

    //Increase for more results
    // await page.select('select[name="orderFilter"]', `year-${new Date().getFullYear().toString()}`);
    // await page.waitForNavigation();

    // TODO Get pages
    // const pages = await (await page.waitForSelector('.pagination-full ul.a-pagination li:nth-last-child(2) a')).evaluate(handle => parseInt(handle.innerText));
    // console.log("Page count:", pages);



    const orderCards = await page.$$(selectors.orderCards);
    console.log(`Got ${orderCards.length} orders. Processing...`);

    let orders = new Array<Order>();

    for (let [i, orderCard] of orderCards.entries()) {

        const orderNumber: string = await orderCard.$eval(selectors.orderNr, (handle: HTMLElement) => handle.innerText.trim());
        const orderDate = await orderCard.$eval(selectors.orderDate, (handle: HTMLElement) => handle.innerText);
        const orderDateLuxon = DateTime.fromFormat(orderDate, "DATE_FULL", { locale: "de" });

        console.log("Got Order:", orderNumber);
        console.log("Order date:", orderDate);

        const invoiceSpan = await orderCard.$(selectors.invoiceSpans);

        invoiceSpan.click();
        console.log("Checking popover", i + 1)
        await new Promise(r => setTimeout(r, 3000));

        const invoiceUrls = await page.$$eval(selectors.invoiceList.replace("{{index}}", (i + 1).toString()), (handles: Array<HTMLAnchorElement>) => handles.map(a => a.href));

        if (invoiceUrls.length == 0) {
            console.log("No invoices found. Order may be undelivered. You have to wait 😐")
        } else {
            orders.push({ date: orderDateLuxon, number: orderNumber, invoiceUrls, datePlain: orderDate });
            console.log("Invoices found 🔫", invoiceUrls);
        }

    }

    console.log("Processing orders:", orders);

    for (let order of orders) {
        for (let invoiceUrl of order.invoiceUrls) {
            const dlpage = await browser.newPage();
            const session = await dlpage.target().createCDPSession()
            await dlpage.setRequestInterception(true);
            // await session.send('Page.setDownloadBehavior', {
            //     behavior: 'allow',
            //     downloadPath: "C:\\temp\\amazon\\"
            // })

            await dlpage.on('request', interceptedRequest => {
                if (interceptedRequest.isInterceptResolutionHandled()) return;
                interceptedRequest.continue();
            });
            await dlpage.on('response', async response => {
                const status = response.status()
                if ((status >= 300) && (status <= 399)) {
                    console.log('Redirect from', response.url(), 'to', response.headers()['location'])
                } else {
                    var buffer = await response.buffer(); /*You can get the buffer*/
                    console.log("Buffer", buffer);
                    var content = await response.text(); /*You can get the content as text*/
                    console.log("Content", content);
                }
            });

            await dlpage.goto(invoiceUrl);

            await new Promise(r => setTimeout(r, 2000));

            // });

            // const buffer = await page.pdf({
            //     path: `C:\\temp\\amazon\\${order.datePlain.replace(".", '').replace(" ", "_")}_AMZ_${order.number}${path.extname(invoiceUrl)}`,
            //     format: 'A4',
            //     printBackground: true
            // });

            // download(buffer,
            //     path.extname(invoiceUrl),
            //     "C:\\temp\\amazon\\",
            //     `${order.datePlain.replace(".", '').replace(" ", "_")}_AMZ_${order.number}`)

            // await dlpage.close();
        }
    }
})();

interface Order {
    date: DateTime;
    datePlain: string;
    number: string;
    invoiceUrls: Array<string>
}