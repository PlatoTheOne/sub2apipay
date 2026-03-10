import type { Locale } from '@/lib/locale';
import {
  formatStatus,
  formatCreatedAt,
  getStatusBadgeClass,
  getPaymentDisplayInfo,
  type MyOrder,
} from '@/lib/pay-utils';

interface OrderTableProps {
  isDark: boolean;
  locale: Locale;
  loading: boolean;
  error: string;
  orders: MyOrder[];
}

export default function OrderTable({ isDark, locale, loading, error, orders }: OrderTableProps) {
  const text =
    locale === 'en'
      ? {
          empty: 'No matching orders found',
          orderId: 'Order ID',
          amount: 'Amount',
          payment: 'Payment Method',
          status: 'Status',
          createdAt: 'Created At',
        }
      : {
          empty: '暂无符合条件的订单记录',
          orderId: '订单号',
          amount: '金额',
          payment: '支付方式',
          status: '状态',
          createdAt: '创建时间',
        };

  return (
    <div
      className={[
        'rounded-2xl border p-3 sm:p-4',
        isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50/80',
      ].join(' ')}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div
            className={[
              'h-6 w-6 animate-spin rounded-full border-2 border-t-transparent',
              isDark ? 'border-slate-400' : 'border-slate-500',
            ].join(' ')}
          />
        </div>
      ) : error ? (
        <div
          className={[
            'rounded-xl border border-dashed px-4 py-10 text-center text-sm',
            isDark ? 'border-amber-500/40 text-amber-200' : 'border-amber-300 text-amber-700',
          ].join(' ')}
        >
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div
          className={[
            'rounded-xl border border-dashed px-4 py-10 text-center text-sm',
            isDark ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500',
          ].join(' ')}
        >
          {text.empty}
        </div>
      ) : (
        <>
          <div
            className={[
              'hidden rounded-xl px-4 py-2 text-xs font-medium md:grid md:grid-cols-[1.2fr_0.6fr_0.8fr_0.8fr_1fr]',
              isDark ? 'text-slate-300' : 'text-slate-600',
            ].join(' ')}
          >
            <span>{text.orderId}</span>
            <span>{text.amount}</span>
            <span>{text.payment}</span>
            <span>{text.status}</span>
            <span>{text.createdAt}</span>
          </div>
          <div className="space-y-2 md:space-y-0">
            {orders.map((order) => (
              <div
                key={order.id}
                className={[
                  'border-t px-4 py-3 first:border-t-0 md:grid md:grid-cols-[1.2fr_0.6fr_0.8fr_0.8fr_1fr] md:items-center',
                  isDark ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700',
                ].join(' ')}
              >
                <div className="font-medium">#{order.id.slice(0, 12)}</div>
                <div className="font-semibold">¥{order.amount.toFixed(2)}</div>
                <div>{getPaymentDisplayInfo(order.paymentType, locale).channel}</div>
                <div>
                  <span
                    className={['rounded-full px-2 py-0.5 text-xs', getStatusBadgeClass(order.status, isDark)].join(
                      ' ',
                    )}
                  >
                    {formatStatus(order.status, locale)}
                  </span>
                </div>
                <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  {formatCreatedAt(order.createdAt, locale)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
