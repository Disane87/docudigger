import { OtpGenerator, OtpOptions } from "../interfaces/otp.interface";
import { TOTP } from "totp-generator"
import { Logger } from "winston";

export class KeyBasedOtp implements OtpGenerator
{
  constructor(private logger: Logger) {
  }

  async generate(options: OtpOptions): Promise<string> {
    if (!('otpKey' in options)) {
      throw new Error('OTP key required');
    }

    this.logger.debug(`OTP key provided, generating TOTP token`);

    const otp = await TOTP.generate(options.otpKey);

    this.logger.debug(`Generated OTP token: ${otp.otp}`);

    return otp.otp;
  }
}
