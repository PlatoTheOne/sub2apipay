'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/locale';
import { pickLocaleText } from '@/lib/locale';
import { getPaymentTypeLabel, getPaymentIconSrc } from '@/lib/pay-utils';
import type { PlanInfo } from '@/components/SubscriptionPlanCard';
import { formatValidityLabel } from '@/lib/subscription-utils';
import { PlatformBadge } from '@/lib/platform-style';

interface SubscriptionConfirmProps {
  plan: PlanInfo;
  paymentTypes: string[];
  onBack: () => void;
  onSubmit: (paymentType: string) => void;
  loading: boolean;
  isDark: boolean;
  locale: Locale;
}

export default function SubscriptionConfirm({
  plan,
  paymentTypes,
  onBack,
  onSubmit,
  loading,
  isDark,
  locale,
}: SubscriptionConfirmProps) {
  const [selectedPayment, setSelectedPayment] = useState(paymentTypes[0] || '');

  const periodLabel = formatValidityLabel(plan.validityDays, plan.validityUnit ?? 'day', locale);

  const hasLimits = plan.limits && (
    plan.limits.daily_limit_usd !== null ||
    plan.limits.weekly_limit_usd !== null ||
    plan.limits.monthly_limit_usd !== null
  );

  const isOpenAI = plan.platform?.toLowerCase() === 'openai';

  const handleSubmit = () => {
    if (selectedPayment && !loading) {
      onSubmit(selectedPayment);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className={[
          'flex items-center gap-1 text-sm transition-colors',
          isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700',
        ].join(' ')}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {pickLocaleText(locale, '返回套餐页面', 'Back to Plans')}
      </button>

      {/* Title */}
      <h2 className={['text-xl font-semibold', isDark ? 'text-slate-100' : 'text-slate-900'].join(' ')}>
        {pickLocaleText(locale, '确认订单', 'Confirm Order')}
      </h2>

      {/* Plan detail card */}
      <div
        className={[
          'rounded-2xl border p-5 space-y-4',
          isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white',
        ].join(' ')}
      >
        {/* Header: Platform badge + Name + Period + messages dispatch */}
        <div className="flex items-center gap-2 flex-wrap">
          {plan.platform && <PlatformBadge platform={plan.platform} />}
          <span className={['text-lg font-bold', isDark ? 'text-slate-100' : 'text-slate-900'].join(' ')}>
            {plan.name}
          </span>
          <span
            className={[
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {periodLabel}
          </span>
          {isOpenAI && plan.allowMessagesDispatch && (
            <span className={[
              'rounded-full px-2 py-0.5 text-xs font-medium',
              isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700',
            ].join(' ')}>
              /v1/messages
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          {plan.originalPrice !== null && (
            <span className={['text-sm line-through', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
              ¥{plan.originalPrice}
            </span>
          )}
          <span className="text-2xl font-bold text-emerald-500">¥{plan.price}</span>
        </div>

        {/* Description */}
        {plan.description && (
          <p className={['text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
            {plan.description}
          </p>
        )}

        {/* Rate + Limits grid */}
        {(plan.rateMultiplier != null || hasLimits) && (
          <div className="grid grid-cols-2 gap-3">
            {plan.rateMultiplier != null && (
              <div>
                <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  {pickLocaleText(locale, '倍率', 'Rate')}
                </span>
                <div className="flex items-baseline">
                  <span className="text-lg font-bold text-emerald-500">1</span>
                  <span className={['mx-1 text-base', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>:</span>
                  <span className="text-lg font-bold text-emerald-500">{plan.rateMultiplier}</span>
                </div>
              </div>
            )}
            {plan.limits?.daily_limit_usd != null && (
              <div>
                <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  {pickLocaleText(locale, '日限额', 'Daily Limit')}
                </span>
                <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                  ${plan.limits.daily_limit_usd}
                </div>
              </div>
            )}
            {plan.limits?.weekly_limit_usd != null && (
              <div>
                <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  {pickLocaleText(locale, '周限额', 'Weekly Limit')}
                </span>
                <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                  ${plan.limits.weekly_limit_usd}
                </div>
              </div>
            )}
            {plan.limits?.monthly_limit_usd != null && (
              <div>
                <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  {pickLocaleText(locale, '月限额', 'Monthly Limit')}
                </span>
                <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                  ${plan.limits.monthly_limit_usd}
                </div>
              </div>
            )}
          </div>
        )}

        {/* OpenAI specific: default model */}
        {isOpenAI && plan.defaultMappedModel && (
          <div className={[
            'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
            isDark ? 'border-green-500/20 bg-green-500/5' : 'border-green-500/20 bg-green-50/50',
          ].join(' ')}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {pickLocaleText(locale, '默认模型', 'Default Model')}
            </span>
            <span className={['text-xs font-mono', isDark ? 'text-slate-300' : 'text-slate-700'].join(' ')}>
              {plan.defaultMappedModel}
            </span>
          </div>
        )}

        {/* Features */}
        {plan.features.length > 0 && (
          <div>
            <p className={['mb-2 text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
              {pickLocaleText(locale, '功能特性', 'Features')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.features.map((feature) => (
                <span
                  key={feature}
                  className={[
                    'rounded-md px-2 py-1 text-xs',
                    isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
                  ].join(' ')}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment method selector */}
      <div>
        <label className={['mb-2 block text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
          {pickLocaleText(locale, '支付方式', 'Payment Method')}
        </label>
        <div className="space-y-2">
          {paymentTypes.map((type) => {
            const isSelected = selectedPayment === type;
            const iconSrc = getPaymentIconSrc(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedPayment(type)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  isSelected
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                    : isDark
                      ? 'border-slate-700 hover:border-slate-600'
                      : 'border-slate-200 hover:border-slate-300',
                  isSelected
                    ? isDark
                      ? 'bg-emerald-950/30'
                      : 'bg-emerald-50/50'
                    : isDark
                      ? 'bg-slate-800/60'
                      : 'bg-white',
                ].join(' ')}
              >
                {/* Radio indicator */}
                <span
                  className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-emerald-500' : isDark ? 'border-slate-600' : 'border-slate-300',
                  ].join(' ')}
                >
                  {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                </span>

                {/* Icon */}
                {iconSrc && (
                  <Image src={iconSrc} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                )}

                {/* Label */}
                <span className={['text-sm font-medium', isDark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
                  {getPaymentTypeLabel(type, locale)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount to pay */}
      <div
        className={[
          'flex items-center justify-between rounded-xl border px-4 py-3',
          isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50',
        ].join(' ')}
      >
        <span className={['text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
          {pickLocaleText(locale, '应付金额', 'Amount Due')}
        </span>
        <span className="text-xl font-bold text-emerald-500">¥{plan.price}</span>
      </div>

      {/* Submit button */}
      <button
        type="button"
        disabled={!selectedPayment || loading}
        onClick={handleSubmit}
        className={[
          'w-full rounded-xl py-3 text-sm font-bold text-white transition-colors',
          selectedPayment && !loading
            ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
            : isDark
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : 'cursor-not-allowed bg-slate-200 text-slate-400',
        ].join(' ')}
      >
        {loading
          ? pickLocaleText(locale, '处理中...', 'Processing...')
          : pickLocaleText(locale, '立即购买', 'Buy Now')}
      </button>
    </div>
  );
}
