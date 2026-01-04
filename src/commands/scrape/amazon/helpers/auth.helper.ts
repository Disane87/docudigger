import { Command } from "@oclif/core";
import { AmazonSelectors } from "../../../../interfaces/selectors.interface";
import { Page } from "../../../../classes/puppeteer.class";
import { AmazonDefinition } from "../../../../interfaces/amazon.interface";
import { AmazonOptions } from "../../../../interfaces/amazon-options.interface";
import winston from "winston";
import { OtpGenerator } from "../../../../interfaces/otp.interface";

export const login = async (
  page: Page,
  selectors: AmazonSelectors,
  options: AmazonOptions,
  amazonUrls: AmazonDefinition,
  logger: winston.Logger,
  command: Command,
  otp: OtpGenerator
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

  await deactivatePasskeys(page);

  while (!hasMessages) {
    logger.debug(`Selectors: ${JSON.stringify(selectors, null, 4)}`);

    await page.goto(amazonUrls.loginPage);

    await page.type(`input[type=email]`, options.username);
    await page.click(`input[type=submit]`);
    await page.waitForNavigation();

    logger.debug('Username successfully entered')

    await page.type(`input[type=password]`, options.password);
    await page.click(`input[type=submit]`);
    await page.waitForNavigation();

    logger.debug('Password successfully entered')

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
      const secondFactor = await otp.generate(options)

      await page.type(`input#auth-mfa-otpcode`, secondFactor);
      await page.click(`input#auth-mfa-remember-device`);
      await page.click(`input[type=submit]`);

      await page.waitForNavigation();
    }
    logger.info(`Logged in`);
    return true;
  }
};

async function deactivatePasskeys(page: Page) {
  const cdp = await page.createCDPSession();
  await cdp.send(`WebAuthn.enable`);
  await cdp.send(`WebAuthn.addVirtualAuthenticator`, {
    options: {
      protocol: `ctap2`,
      transport: `internal`,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    }
  });
}
