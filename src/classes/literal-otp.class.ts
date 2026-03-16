import { OtpGenerator, OtpOptions } from "../interfaces/otp.interface";

export class LiteralOtp implements OtpGenerator
{
  async generate(options: OtpOptions): Promise<string> {
    if (!('otp' in options)) {
      throw new Error('OTP required');
    }

    return options.otp;
  }
}
