import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserByToken, getAllGroups } from '@/lib/sub2api/client';

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 401 });
  }

  try {
    await getCurrentUserByToken(token);
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  try {
    const [plans, groups] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { forSale: true },
        orderBy: { sortOrder: 'asc' },
      }),
      getAllGroups(),
    ]);

    const activeGroupMap = new Map(groups.filter((g) => g.status === 'active').map((g) => [g.id, g] as const));

    const results = plans
      .map((plan) => {
        if (plan.groupId === null) return null;
        const group = activeGroupMap.get(plan.groupId);
        if (!group) return null;

        return {
          id: plan.id,
          groupId: plan.groupId,
          groupName: group.name ?? null,
          name: plan.name,
          description: plan.description,
          price: Number(plan.price),
          originalPrice: plan.originalPrice ? Number(plan.originalPrice) : null,
          validityDays: plan.validityDays,
          validityUnit: plan.validityUnit,
          features: parseJsonArray(plan.features),
          productName: plan.productName ?? null,
          platform: group.platform ?? null,
          rateMultiplier: group.rate_multiplier ?? null,
          limits: {
            daily_limit_usd: group.daily_limit_usd,
            weekly_limit_usd: group.weekly_limit_usd,
            monthly_limit_usd: group.monthly_limit_usd,
          },
          allowMessagesDispatch: group.allow_messages_dispatch ?? false,
          defaultMappedModel: group.default_mapped_model ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ plans: results });
  } catch (error) {
    console.error('Failed to list subscription plans:', error);
    return NextResponse.json({ error: 'failed to load subscription plans' }, { status: 500 });
  }
}

