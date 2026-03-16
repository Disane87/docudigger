export type OtpOptions = { otpKey: string }
  | { otp: string }
  | { otpProvider: URL}

export interface OtpGenerator {
  generate(options: OtpOptions): Promise<string>
}
