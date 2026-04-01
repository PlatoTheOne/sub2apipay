import { prisma } from '@/lib/db';
import { getEnv } from '@/lib/config';
import { ORDER_STATUS } from '@/lib/constants';
import { initPaymentProviders, paymentRegistry } from '@/lib/payment';
import { getMethodFeeRate } from './fee';
import { getBizDayStartUTC } from '@/lib/time/biz-day';

/**
 * 获取指定支付渠道的每日全平台限额（0 = 不限制）。
 * 优先级：环境变量显式配置 > provider 默认值 > process.env 兜底 > 0
 */
export function getMethodDailyLimit(paymentType: string): number {
  const env = getEnv();
  const key = `MAX_DAILY_AMOUNT_${paymentType.toUpperCase()}` as keyof typeof env;
  const val = env[key];
  if (typeof val === 'number') return val;

  initPaymentProviders();
  const providerDefault = paymentRegistry.getDefaultLimit(paymentType);
  if (providerDefault?.dailyMax !== undefined) return providerDefault.dailyMax;

  const raw = process.env[`MAX_DAILY_AMOUNT_${paymentType.toUpperCase()}`];
  if (raw !== undefined) {
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }
  return 0;
}

/**
 * 获取指定支付渠道的单笔限额（0 = 使用全局 MAX_RECHARGE_AMOUNT）。
 * 优先级：process.env MAX_SINGLE_AMOUNT_* > provider 默认值 > 0
 */
export function getMethodSingleLimit(paymentType: string): number {
  const raw = process.env[`MAX_SINGLE_AMOUNT_${paymentType.toUpperCase()}`];
  if (raw !== undefined) {
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0) return num;
  }

  initPaymentProviders();
  const providerDefault = paymentRegistry.getDefaultLimit(paymentType);
  if (providerDefault?.singleMax !== undefined) return providerDefault.singleMax;

  return 0;
}

export interface MethodLimitStatus {
  dailyLimit: number;
  used: number;
  remaining: number | null;
  available: boolean;
  singleMin: number;
  singleMax: number;
  feeRate: number;
}

interface InstanceChannelLimits {
  dailyLimit?: number;
  singleMin?: number;
  singleMax?: number;
}

/**
 * 聚合实例级限额：对每个支付类型，取所有实例中最宽松的单笔范围 + 检查日限额是否全部用满。
 */
async function aggregateInstanceLimits(
  paymentTypes: string[],
): Promise<
  Record<string, { singleMin: number; singleMax: number; allInstancesDailyBlocked: boolean; hasInstances: boolean }>
> {
  const result: Record<
    string,
    { singleMin: number; singleMax: number; allInstancesDailyBlocked: boolean; hasInstances: boolean }
  > = {};

  const allInstances = await prisma.paymentProviderInstance.findMany({
    where: { enabled: true },
    select: { id: true, limits: true, supportedTypes: true },
  });

  if (allInstances.length === 0) {
    // 无实例，不施加实例级限制
    for (const type of paymentTypes) {
      result[type] = { singleMin: 0, singleMax: 0, allInstancesDailyBlocked: false, hasInstances: false };
    }
    return result;
  }

  const todayStart = getBizDayStartUTC();

  // 批量查询所有实例今日用量
  const usageRows = await prisma.order.groupBy({
    by: ['providerInstanceId'],
    where: {
      providerInstanceId: { in: allInstances.map((i) => i.id) },
      status: { in: [ORDER_STATUS.PAID, ORDER_STATUS.RECHARGING, ORDER_STATUS.COMPLETED] },
      paidAt: { gte: todayStart },
    },
    _sum: { payAmount: true },
  });
  const usageMap = new Map(usageRows.map((r) => [r.providerInstanceId, Number(r._sum.payAmount ?? 0)]));

  for (const type of paymentTypes) {
    // 筛出支持此渠道的实例
    const supporting = allInstances.filter((inst) => {
      if (!inst.supportedTypes) return true;
      const types = inst.supportedTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return types.length === 0 || types.includes(type);
    });

    if (supporting.length === 0) {
      result[type] = { singleMin: 0, singleMax: 0, allInstancesDailyBlocked: false, hasInstances: false };
      continue;
    }

    let aggSingleMin = Infinity;
    let aggSingleMax = 0;
    let allBlocked = true;

    for (const inst of supporting) {
      let channelLimits: InstanceChannelLimits | undefined;
      if (inst.limits) {
        try {
          const parsed = JSON.parse(inst.limits) as Record<string, InstanceChannelLimits>;
          channelLimits = parsed[type];
        } catch {
          /* ignore */
        }
      }

      // 单笔范围：取所有实例中最宽松的范围
      const instMin = channelLimits?.singleMin ?? 0;
      const instMax = channelLimits?.singleMax ?? 0;
      if (instMin > 0 && instMin < aggSingleMin) aggSingleMin = instMin;
      if (instMin === 0) aggSingleMin = 0; // 有实例不限最小值
      if (instMax > aggSingleMax) aggSingleMax = instMax;
      if (instMax === 0) aggSingleMax = 0; // 有实例不限最大值，则聚合结果也不限

      // 日限额：检查是否所有实例都已用满
      const instDailyLimit = channelLimits?.dailyLimit;
      if (!instDailyLimit || instDailyLimit <= 0) {
        // 该实例不限日额，至少有一个可用
        allBlocked = false;
      } else {
        const used = usageMap.get(inst.id) ?? 0;
        if (used < instDailyLimit) {
          allBlocked = false;
        }
      }
    }

    // aggSingleMax === 0 代表不限
    if (aggSingleMin === Infinity) aggSingleMin = 0;

    result[type] = {
      singleMin: aggSingleMin,
      singleMax: aggSingleMax,
      allInstancesDailyBlocked: allBlocked,
      hasInstances: true,
    };
  }

  return result;
}

/**
 * 批量查询多个支付渠道的今日使用情况。
 * 聚合全局限额 + 实例级限额，一次性返回前端所需的可用性信息。
 */
export async function queryMethodLimits(paymentTypes: string[]): Promise<Record<string, MethodLimitStatus>> {
  const todayStart = getBizDayStartUTC();

  const [usageRows, instanceAgg] = await Promise.all([
    prisma.order.groupBy({
      by: ['paymentType'],
      where: {
        paymentType: { in: paymentTypes },
        status: { in: [ORDER_STATUS.PAID, ORDER_STATUS.RECHARGING, ORDER_STATUS.COMPLETED] },
        paidAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    aggregateInstanceLimits(paymentTypes),
  ]);

  const usageMap = Object.fromEntries(usageRows.map((row) => [row.paymentType, Number(row._sum.amount ?? 0)]));

  const result: Record<string, MethodLimitStatus> = {};
  for (const type of paymentTypes) {
    const globalDailyLimit = getMethodDailyLimit(type);
    const globalSingleMax = getMethodSingleLimit(type);
    const feeRate = getMethodFeeRate(type);
    const used = usageMap[type] ?? 0;
    const remaining = globalDailyLimit > 0 ? Math.max(0, globalDailyLimit - used) : null;

    const inst = instanceAgg[type];
    // 全局可用：全局日限额未超
    const globalAvailable = globalDailyLimit === 0 || used < globalDailyLimit;
    // 实例可用：无实例(走环境变量provider) 或 不是所有实例都被日限额阻塞
    const instanceAvailable = !inst?.hasInstances || !inst.allInstancesDailyBlocked;

    // 聚合单笔范围：实例级限额与全局取交集
    const singleMin = inst?.singleMin ?? 0;
    let singleMax = globalSingleMax;
    if (inst?.hasInstances && inst.singleMax > 0) {
      // 实例有限制时，取全局和实例中较小的
      singleMax = singleMax > 0 ? Math.min(singleMax, inst.singleMax) : inst.singleMax;
    }

    result[type] = {
      dailyLimit: globalDailyLimit,
      used,
      remaining,
      available: globalAvailable && instanceAvailable,
      singleMin,
      singleMax,
      feeRate,
    };
  }
  return result;
}
