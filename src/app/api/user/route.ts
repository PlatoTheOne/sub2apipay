import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserByToken } from '@/lib/sub2api/client';
import { getEnv } from '@/lib/config';
import { queryMethodLimits } from '@/lib/order/limits';
import { initPaymentProviders, paymentRegistry } from '@/lib/payment';
import { getPaymentDisplayInfo } from '@/lib/pay-utils';
import { resolveLocale } from '@/lib/locale';
import { getSystemConfig } from '@/lib/system-config';
import { resolveEnabledPaymentTypes } from '@/lib/payment/resolve-enabled-types';

export async function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get('lang'));
  const userId = Number(request.nextUrl.searchParams.get('user_id'));
  if (!userId || Number.isNaN(userId) || userId <= 0) {
    return NextResponse.json(
      { error: locale === 'en' ? 'Invalid user ID' : '无效的用户 ID' },
      { status: 400 },
    );
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json(
      { error: locale === 'en' ? 'Missing token parameter' : '缺少 token 参数' },
      { status: 401 },
    );
  }

  let tokenUser;
  try {
    tokenUser = await getCurrentUserByToken(token);
  } catch {
    return NextResponse.json(
      { error: locale === 'en' ? 'Invalid token' : '无效的 token' },
      { status: 401 },
    );
  }

  if (tokenUser.id !== userId) {
    return NextResponse.json(
      { error: locale === 'en' ? 'Forbidden to access this user' : '无权访问该用户信息' },
      { status: 403 },
    );
  }

  try {
    const env = getEnv();
    initPaymentProviders();
    const supportedTypes = paymentRegistry.getSupportedTypes();

    const [configuredPaymentTypesRaw, balanceDisabledVal, maxPendingVal, minAmountVal, maxAmountVal, dailyLimitVal] =
      await Promise.all([
        getSystemConfig('ENABLED_PAYMENT_TYPES'),
        getSystemConfig('BALANCE_PAYMENT_DISABLED'),
        getSystemConfig('MAX_PENDING_ORDERS'),
        getSystemConfig('RECHARGE_MIN_AMOUNT'),
        getSystemConfig('RECHARGE_MAX_AMOUNT'),
        getSystemConfig('DAILY_RECHARGE_LIMIT'),
      ]);

    const enabledTypes = resolveEnabledPaymentTypes(supportedTypes, configuredPaymentTypesRaw);
    const methodLimits = await queryMethodLimits(enabledTypes);
    const balanceDisabled = balanceDisabledVal === 'true';
    const maxPendingOrders = maxPendingVal ? parseInt(maxPendingVal, 10) || 3 : 3;
    const minAmount = minAmountVal ? parseFloat(minAmountVal) || env.MIN_RECHARGE_AMOUNT : env.MIN_RECHARGE_AMOUNT;
    const maxAmount = maxAmountVal ? parseFloat(maxAmountVal) || env.MAX_RECHARGE_AMOUNT : env.MAX_RECHARGE_AMOUNT;
    const maxDailyAmount = dailyLimitVal ? parseFloat(dailyLimitVal) : env.MAX_DAILY_RECHARGE_AMOUNT;

    const sublabelOverrides: Record<string, string> = {};
    const labelCount = new Map<string, string[]>();
    for (const type of enabledTypes) {
      const { channel } = getPaymentDisplayInfo(type, locale);
      const types = labelCount.get(channel) || [];
      types.push(type);
      labelCount.set(channel, types);
    }

    for (const [, types] of labelCount) {
      if (types.length <= 1) continue;
      for (const type of types) {
        const { provider } = getPaymentDisplayInfo(type, locale);
        if (provider) sublabelOverrides[type] = provider;
      }
    }

    if (env.PAYMENT_SUBLABEL_ALIPAY) sublabelOverrides.alipay = env.PAYMENT_SUBLABEL_ALIPAY;
    if (env.PAYMENT_SUBLABEL_ALIPAY_DIRECT) sublabelOverrides.alipay_direct = env.PAYMENT_SUBLABEL_ALIPAY_DIRECT;
    if (env.PAYMENT_SUBLABEL_WXPAY) sublabelOverrides.wxpay = env.PAYMENT_SUBLABEL_WXPAY;
    if (env.PAYMENT_SUBLABEL_WXPAY_DIRECT) sublabelOverrides.wxpay_direct = env.PAYMENT_SUBLABEL_WXPAY_DIRECT;
    if (env.PAYMENT_SUBLABEL_STRIPE) sublabelOverrides.stripe = env.PAYMENT_SUBLABEL_STRIPE;

    return NextResponse.json({
      user: {
        id: tokenUser.id,
        status: tokenUser.status,
      },
      config: {
        enabledPaymentTypes: enabledTypes,
        minAmount,
        maxAmount,
        maxDailyAmount,
        methodLimits,
        helpImageUrl: env.PAY_HELP_IMAGE_URL ?? null,
        helpText: env.PAY_HELP_TEXT ?? null,
        stripePublishableKey:
          enabledTypes.includes('stripe') && env.STRIPE_PUBLISHABLE_KEY ? env.STRIPE_PUBLISHABLE_KEY : null,
        balanceDisabled,
        maxPendingOrders,
        sublabelOverrides: Object.keys(sublabelOverrides).length > 0 ? sublabelOverrides : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: locale === 'en' ? 'User not found' : '用户不存在' }, { status: 404 });
    }

    console.error('Get user error:', error);
    return NextResponse.json(
      { error: locale === 'en' ? 'Failed to fetch user info' : '获取用户信息失败' },
      { status: 500 },
    );
  }
}
