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
    const [channels, groups] = await Promise.all([
      prisma.channel.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' },
      }),
      getAllGroups(),
    ]);

    const activeGroupIds = new Set(groups.filter((g) => g.status === 'active').map((g) => g.id));

    const results = channels
      .map((ch) => {
        if (ch.groupId !== null && !activeGroupIds.has(ch.groupId)) {
          return null;
        }

        return {
          id: ch.id,
          groupId: ch.groupId,
          name: ch.name,
          platform: ch.platform,
          rateMultiplier: Number(ch.rateMultiplier),
          description: ch.description,
          models: parseJsonArray(ch.models),
          features: parseJsonArray(ch.features),
          sortOrder: ch.sortOrder,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ channels: results });
  } catch (error) {
    console.error('Failed to list channels:', error);
    return NextResponse.json({ error: 'failed to load channels' }, { status: 500 });
  }
}

