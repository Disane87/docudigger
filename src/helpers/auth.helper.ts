import { ux } from "@oclif/core";
import { AmazonSelectors } from "../interfaces/selectors.interface";
import { Page } from "../classes/puppeteer.class";
import { AmazonDefinition } from "../interfaces/amazon.interface";

export const login = async (page: Page, selectors: AmazonSelectors, options, amazonUrls: AmazonDefinition, logger): Promise<boolean> => {
    let hasMessages = false;

    const checkForAuthMessages = async (type: `Error` | `Warning`) => {
        // Check if this is the sign in page again i.e. for false password
        if (page.url().indexOf(amazonUrls.loginPage) > -1) {
            const messages = (await page.$$eval(selectors[`auth${type}`], handles => handles.map((listItem: HTMLUListElement) => listItem.innerText))) || [];
            hasMessages = messages.length > 0;

            if (hasMessages) {
                if (type == `Error`) {
                    logger.error(messages);
                }

                if (type == `Warning`) {
                    logger.warn(messages);
                }
            }

            return messages;
        }
    };

    while (!hasMessages) {

        if (!options.username && !options.password) {
            options.username = await ux.prompt(`What is your amazaon username?`);
            options.password = await ux.prompt(`What is your password?`, { type: `hide` });
        }

        logger.debug(`Selectors: ${JSON.stringify(selectors, null, 4)}`);

        await page.goto(amazonUrls.loginPage);


        await page.type(`input[type=email]`, options.username);
        await page.click(`input[type=submit]`);
        await page.waitForNavigation();


        await page.type(`input[type=password]`, options.password);
        await page.click(`input[type=submit]`);
        await page.waitForNavigation();

        const authErrors = await checkForAuthMessages(`Error`);
        const authWarning = await checkForAuthMessages(`Warning`);

        if (authErrors?.length > 0) {
            return false;
        }

        if (authWarning?.length > 0) {
            const captchaImageUrl = await page.$eval(selectors.captchaImage, (image: HTMLImageElement) => image.src);
            if (captchaImageUrl) {
                logger.error(`Auth with captcha is currently unsupported`);

                // const captchaImagePage = await browser.newPage();
                // const captchaResponse = await captchaImagePage.goto(captchaImageUrl);
                // const tempFolder = `./cache/`;
                // const imageFilePath = path.join(tempFolder, path.basename(captchaImageUrl.split(`?`)[0]));

                // !fs.existsSync(tempFolder) && fs.mkdirSync(tempFolder);
                // await fs.writeFileSync(imageFilePath, await captchaResponse.buffer());

                // const text = await tessaract.recognize(fs.readFileSync(imageFilePath), {
                //     lang: `eng`, // default
                //     debug: true,
                //     psm: 1
                // });
                // await captchaImagePage.close();
                return false;
            }
        }

        // Check if this is the sign in page again i.e. for false password
        checkForAuthMessages(`Error`);
        checkForAuthMessages(`Warning`);
        // if (page.url().indexOf(`/ap/signin?`) > -1) {
        //     const errors = await page.$$eval(selectors.authError, handles => handles.map((listItem: HTMLUListElement) => listItem.innerText));
        //     authError = errors.length > 0;

        //     logger.error(`Password or username incorrect. Please try again`);
        // }
        

        if (page.url().indexOf(`/mfa?`) > -1) {
            logger.info(`MFA detected`);
            const secondFactor = await ux.prompt(`What is your two-factor token?`, { type: `mask` });
            await page.type(`input#auth-mfa-otpcode`, secondFactor);
            await page.click(`input#auth-mfa-remember-device`);
            await page.click(`input[type=submit]`);

            await page.waitForNavigation();
        }
        logger.info(`Logged in`);
        return true;
    }

};