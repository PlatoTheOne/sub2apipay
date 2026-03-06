import WxPay from 'wechatpay-node-v3';
import { getEnv } from '@/lib/config';
import type { WxpayPcOrderParams, WxpayH5OrderParams, WxpayRefundParams } from './types';

const BASE_URL = 'https://api.mch.weixin.qq.com';

function assertWxpayEnv(env: ReturnType<typeof getEnv>) {
  if (!env.WXPAY_APP_ID || !env.WXPAY_MCH_ID || !env.WXPAY_PRIVATE_KEY || !env.WXPAY_API_V3_KEY) {
    throw new Error(
      'Wxpay environment variables (WXPAY_APP_ID, WXPAY_MCH_ID, WXPAY_PRIVATE_KEY, WXPAY_API_V3_KEY) are required',
    );
  }
  return env as typeof env & {
    WXPAY_APP_ID: string;
    WXPAY_MCH_ID: string;
    WXPAY_PRIVATE_KEY: string;
    WXPAY_API_V3_KEY: string;
  };
}

let payInstance: WxPay | null = null;

function getPayInstance(): WxPay {
  if (payInstance) return payInstance;
  const env = assertWxpayEnv(getEnv());

  const privateKey = Buffer.from(env.WXPAY_PRIVATE_KEY);
  const publicKey = env.WXPAY_PUBLIC_KEY ? Buffer.from(env.WXPAY_PUBLIC_KEY) : Buffer.alloc(0);

  payInstance = new WxPay({
    appid: env.WXPAY_APP_ID,
    mchid: env.WXPAY_MCH_ID,
    publicKey,
    privateKey,
    key: env.WXPAY_API_V3_KEY,
    serial_no: env.WXPAY_CERT_SERIAL,
  });
  return payInstance;
}

function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

async function request<T>(method: string, url: string, body?: Record<string, unknown>): Promise<T> {
  const pay = getPayInstance();
  const nonce_str = Math.random().toString(36).substring(2, 15);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signature = pay.getSignature(method, nonce_str, timestamp, url, body ? JSON.stringify(body) : '');
  const authorization = pay.getAuthorization(nonce_str, timestamp, signature);

  const headers: Record<string, string> = {
    Authorization: authorization,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Sub2ApiPay/1.0',
  };

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 204) return {} as T;

  const data = await res.json();
  if (!res.ok) {
    const code = (data as Record<string, string>).code || res.status;
    const message = (data as Record<string, string>).message || res.statusText;
    throw new Error(`Wxpay API error: [${code}] ${message}`);
  }

  return data as T;
}

/** PC 扫码支付（微信官方 API: /v3/pay/transactions/native） */
export async function createPcOrder(params: WxpayPcOrderParams): Promise<string> {
  const env = assertWxpayEnv(getEnv());
  const result = await request<{ code_url: string }>('POST', '/v3/pay/transactions/native', {
    appid: env.WXPAY_APP_ID,
    mchid: env.WXPAY_MCH_ID,
    description: params.description,
    out_trade_no: params.out_trade_no,
    notify_url: params.notify_url,
    amount: { total: yuanToFen(params.amount), currency: 'CNY' },
  });
  return result.code_url;
}

export async function createH5Order(params: WxpayH5OrderParams): Promise<string> {
  const env = assertWxpayEnv(getEnv());
  const result = await request<{ h5_url: string }>('POST', '/v3/pay/transactions/h5', {
    appid: env.WXPAY_APP_ID,
    mchid: env.WXPAY_MCH_ID,
    description: params.description,
    out_trade_no: params.out_trade_no,
    notify_url: params.notify_url,
    amount: { total: yuanToFen(params.amount), currency: 'CNY' },
    scene_info: {
      payer_client_ip: params.payer_client_ip,
      h5_info: { type: 'Wap' },
    },
  });
  return result.h5_url;
}

export async function queryOrder(outTradeNo: string): Promise<Record<string, unknown>> {
  const env = assertWxpayEnv(getEnv());
  const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${env.WXPAY_MCH_ID}`;
  return request<Record<string, unknown>>('GET', url);
}

export async function closeOrder(outTradeNo: string): Promise<void> {
  const env = assertWxpayEnv(getEnv());
  const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
  await request('POST', url, { mchid: env.WXPAY_MCH_ID });
}

export async function createRefund(params: WxpayRefundParams): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('POST', '/v3/refund/domestic/refunds', {
    out_trade_no: params.out_trade_no,
    out_refund_no: params.out_refund_no,
    reason: params.reason,
    amount: {
      refund: yuanToFen(params.amount),
      total: yuanToFen(params.total),
      currency: 'CNY',
    },
  });
}

export function decipherNotify<T>(ciphertext: string, associatedData: string, nonce: string): T {
  const pay = getPayInstance();
  return pay.decipher_gcm<T>(ciphertext, associatedData, nonce);
}

export async function verifyNotifySign(params: {
  timestamp: string;
  nonce: string;
  body: string;
  serial: string;
  signature: string;
}): Promise<boolean> {
  const pay = getPayInstance();
  return pay.verifySign({
    timestamp: params.timestamp,
    nonce: params.nonce,
    body: params.body,
    serial: params.serial,
    signature: params.signature,
  });
}
