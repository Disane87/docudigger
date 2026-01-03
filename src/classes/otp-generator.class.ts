import { OtpGenerator, OtpOptions } from "../interfaces/otp.interface";

export class CompositeOtpGenerator implements OtpGenerator
{
  constructor(private keyBased: OtpGenerator, private literal: OtpGenerator, private provider: OtpGenerator)
  {}

  generate(options: OtpOptions): Promise<string> {

    if ('otp' in options) {
      return this.literal.generate(options);
    }

    if ('otpKey' in options) {
      return this.keyBased.generate(options);
    }

    if ('otpProvider' in options) {
      throw new Error('Not implemented');
    }

    throw new Error('Cannot generate OTP');
  }
}
