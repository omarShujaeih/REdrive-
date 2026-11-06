import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5050),
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // In development, OTP codes are returned in API responses so the flow can be tested without SMS/email providers.
  showDevCodes: process.env.SHOW_DEV_CODES !== 'false',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'Redrive <no-reply@redrive.ps>',
  },
};

// Business rules (taken from the design)
export const rules = {
  commissionRate: 0.10,
  responseHours: 12, // company must respond within 12h
  freeCancelHoursAfterAccept: 6,
  lateCancelChargeRate: 0.60, // retained from the renter on late cancellation / no-show
  noShowGraceHours: 2,
  lateGraceHours: 1, // returning later than this costs a full day per started 24h of lateness
  extensionMinHoursBefore: 12, // extension requests close this many hours before the return time
  termsVersion: '2026-11', // bump when the rental terms text changes

  maxFailedLogins: 5,
  lockMinutes: 15,
  codeMinutes: 15,
};
