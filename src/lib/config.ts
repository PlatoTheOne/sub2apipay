import { z } from 'zod';

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, z.string().optional());

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),

  SUB2API_BASE_URL: z.string().url(),
  SUB2API_ADMIN_API_KEY: z.string().min(1),

  EASY_PAY_PID: optionalTrimmedString,
  EASY_PAY_PKEY: optionalTrimmedString,
  EASY_PAY_API_BASE: optionalTrimmedString,
  EASY_PAY_NOTIFY_URL: optionalTrimmedString,
  EASY_PAY_RETURN_URL: optionalTrimmedString,
  EASY_PAY_CID: optionalTrimmedString,
  EASY_PAY_CID_ALIPAY: optionalTrimmedString,
  EASY_PAY_CID_WXPAY: optionalTrimmedString,

  ZPAY_PID: optionalTrimmedString,
  ZPAY_PKEY: optionalTrimmedString,
  ZPAY_API_BASE: optionalTrimmedString,
  ZPAY_NOTIFY_URL: optionalTrimmedString,
  ZPAY_RETURN_URL: optionalTrimmedString,
  ZPAY_CID: optionalTrimmedString,
  ZPAY_CID_ALIPAY: optionalTrimmedString,
  ZPAY_CID_WXPAY: optionalTrimmedString,

  ENABLED_PAYMENT_TYPES: z.string().default('alipay,wxpay').transform(v => v.split(',').map(s => s.trim())),

  ORDER_TIMEOUT_MINUTES: z.string().default('5').transform(Number).pipe(z.number().int().positive()),
  MIN_RECHARGE_AMOUNT: z.string().default('1').transform(Number).pipe(z.number().positive()),
  MAX_RECHARGE_AMOUNT: z.string().default('10000').transform(Number).pipe(z.number().positive()),
  PRODUCT_NAME: z.string().default('Sub2API Balance Recharge'),

  ADMIN_TOKEN: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_PAY_HELP_IMAGE_URL: optionalTrimmedString,
  NEXT_PUBLIC_PAY_HELP_TEXT: optionalTrimmedString,
});

const resolvedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUB2API_BASE_URL: z.string().url(),
  SUB2API_ADMIN_API_KEY: z.string().min(1),

  EASY_PAY_PID: z.string().min(1),
  EASY_PAY_PKEY: z.string().min(1),
  EASY_PAY_API_BASE: z.string().url(),
  EASY_PAY_NOTIFY_URL: z.string().url(),
  EASY_PAY_RETURN_URL: z.string().url(),
  EASY_PAY_CID: optionalTrimmedString,
  EASY_PAY_CID_ALIPAY: optionalTrimmedString,
  EASY_PAY_CID_WXPAY: optionalTrimmedString,

  ENABLED_PAYMENT_TYPES: z.array(z.string()),

  ORDER_TIMEOUT_MINUTES: z.number().int().positive(),
  MIN_RECHARGE_AMOUNT: z.number().positive(),
  MAX_RECHARGE_AMOUNT: z.number().positive(),
  PRODUCT_NAME: z.string(),

  ADMIN_TOKEN: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_PAY_HELP_IMAGE_URL: optionalTrimmedString,
  NEXT_PUBLIC_PAY_HELP_TEXT: optionalTrimmedString,
});

export type Env = z.infer<typeof resolvedEnvSchema>;

type RawEnv = z.infer<typeof rawEnvSchema>;

function pickRequired(raw: RawEnv, key: keyof RawEnv, fallbackKey: keyof RawEnv): string {
  const value = raw[key] ?? raw[fallbackKey];
  if (!value) {
    throw new Error(`Missing required env: ${String(key)} (fallback: ${String(fallbackKey)})`);
  }
  return value as string;
}

function pickOptional(raw: RawEnv, key: keyof RawEnv, fallbackKey: keyof RawEnv): string | undefined {
  return (raw[key] ?? raw[fallbackKey] ?? undefined) as string | undefined;
}

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = rawEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  const raw = parsed.data;
  const resolved = {
    DATABASE_URL: raw.DATABASE_URL,
    SUB2API_BASE_URL: raw.SUB2API_BASE_URL,
    SUB2API_ADMIN_API_KEY: raw.SUB2API_ADMIN_API_KEY,

    EASY_PAY_PID: pickRequired(raw, 'EASY_PAY_PID', 'ZPAY_PID'),
    EASY_PAY_PKEY: pickRequired(raw, 'EASY_PAY_PKEY', 'ZPAY_PKEY'),
    EASY_PAY_API_BASE: pickRequired(raw, 'EASY_PAY_API_BASE', 'ZPAY_API_BASE'),
    EASY_PAY_NOTIFY_URL: pickRequired(raw, 'EASY_PAY_NOTIFY_URL', 'ZPAY_NOTIFY_URL'),
    EASY_PAY_RETURN_URL: pickRequired(raw, 'EASY_PAY_RETURN_URL', 'ZPAY_RETURN_URL'),
    EASY_PAY_CID: pickOptional(raw, 'EASY_PAY_CID', 'ZPAY_CID'),
    EASY_PAY_CID_ALIPAY: pickOptional(raw, 'EASY_PAY_CID_ALIPAY', 'ZPAY_CID_ALIPAY'),
    EASY_PAY_CID_WXPAY: pickOptional(raw, 'EASY_PAY_CID_WXPAY', 'ZPAY_CID_WXPAY'),

    ENABLED_PAYMENT_TYPES: raw.ENABLED_PAYMENT_TYPES,

    ORDER_TIMEOUT_MINUTES: raw.ORDER_TIMEOUT_MINUTES,
    MIN_RECHARGE_AMOUNT: raw.MIN_RECHARGE_AMOUNT,
    MAX_RECHARGE_AMOUNT: raw.MAX_RECHARGE_AMOUNT,
    PRODUCT_NAME: raw.PRODUCT_NAME,

    ADMIN_TOKEN: raw.ADMIN_TOKEN,

    NEXT_PUBLIC_APP_URL: raw.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PAY_HELP_IMAGE_URL: raw.NEXT_PUBLIC_PAY_HELP_IMAGE_URL,
    NEXT_PUBLIC_PAY_HELP_TEXT: raw.NEXT_PUBLIC_PAY_HELP_TEXT,
  };

  const resolvedParsed = resolvedEnvSchema.safeParse(resolved);
  if (!resolvedParsed.success) {
    console.error('Invalid resolved env variables:', resolvedParsed.error.flatten().fieldErrors);
    throw new Error('Invalid resolved env variables');
  }

  cachedEnv = resolvedParsed.data;
  return cachedEnv;
}
