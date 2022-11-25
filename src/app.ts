import * as puppeteer from 'puppeteer';
import * as prompt from 'prompt';


(async () => {

    prompt.start();

    const browser = await puppeteer.launch({ headless: false, args: ["--window-size=1920,1080"] });
    const page = await browser.newPage();
    await page.goto('https://www.amazon.de/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.de%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=deflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&');
    await page.type("input[type=email]", "disane@icloud.com")
    await page.click("input[type=submit]")
    await page.waitForNavigation();
    await page.type("input[type=password]", "Uo$fww")
    await page.click("input[type=submit]")

    

    await page.waitForNavigation();
    if (page.url().indexOf("/mfa?") > -1) {
        console.log("MFA detected")
        const { otp } = await prompt.get(['otp']);
        await page.type("input#auth-mfa-otpcode", otp);
        await page.click("input#auth-mfa-remember-device")
        await page.click("input[type=submit]")

        await page.waitForNavigation();
    }

    await page.goto("https://www.amazon.de/gp/css/order-history?ref_=nav_AccountFlyout_orders");
    const popoverLinkHandles = await Promise.all(await page.$$("span.a-declarative[data-action='a-popover']"));
    const popoverLinks = await Promise.all(popoverLinkHandles.map(async el => await el.evaluate(domElement => domElement)));
            // .filter(el => el.innerText.trim() == 'Rechnung')

    console.log("Invoice Buttons", await Promise.all(popoverLinks));

    // .then(() => page.type("input[type=password]", "Marco121187"))
    // .then(() => page.click("input[type=submit]"))


    //   await browser.close();
})();