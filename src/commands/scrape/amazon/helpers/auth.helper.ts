import { Command } from "@oclif/core";
import { AmazonSelectors } from "../../../../interfaces/selectors.interface";
import { Page } from "../../../../classes/puppeteer.class";
import { AmazonDefinition } from "../../../../interfaces/amazon.interface";

export const login = async (
  page: Page,
  selectors: AmazonSelectors,
  options,
  amazonUrls: AmazonDefinition,
  logger,
  command: Command
): Promise<boolean> => {
  let hasMessages = false;

  const checkForAuthMessages = async (type: `Error` | `Warning`) => {
    // Check if this is the sign in page again i.e. for false password
    if (page.url().indexOf(amazonUrls.loginPage) > -1) {
      const messages =
        (await page.$$eval(selectors[`auth${type}`], (handles) =>
          handles.map((listItem: HTMLUListElement) => listItem.innerText),
        )) || [];
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
      // options.username = await ux.action(`What is your amazaon username?`);
      // options.password = await ux.prompt(`What is your password?`, {
      //   type: `hide`,
      // });
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

    if (authErrors?.length > 0 || authWarning?.length > 0) {
      logger.error(`Auth not successful. Exiting.`);
      command.exit();
      return;
    }

    const hasCaptcha = !!(await page.$(selectors.captchaPage));

    if (hasCaptcha) {
      logger.error(`Captcha detected. Auth with captcha is currently unsupported. Sorry 😣`);
      return false
    }

    // Check if this is the sign in page again i.e. for false password
    checkForAuthMessages(`Error`);
    checkForAuthMessages(`Warning`);

    if (page.url().indexOf(`/mfa?`) > -1) {
      logger.info(`MFA detected`);
      // const secondFactor = await ux.prompt(`What is your two-factor token?`, {
      //   type: `mask`,
      // });
      // await page.type(`input#auth-mfa-otpcode`, secondFactor);
      await page.click(`input#auth-mfa-remember-device`);
      await page.click(`input[type=submit]`);

      await page.waitForNavigation();
    }
    logger.info(`Logged in`);
    return true;
  }
};
