FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
# 构建时注入 dummy 环境变量，避免 Next.js 预渲染 API 路由时 getEnv() 报错
RUN DATABASE_URL="postgresql://x:x@localhost/x" \
    SUB2API_BASE_URL="https://localhost" \
    SUB2API_ADMIN_API_KEY="build-dummy" \
    ADMIN_TOKEN="build-dummy" \
    NEXT_PUBLIC_APP_URL="https://localhost" \
    pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x start.sh && \
    PRISMA_PKG=$(find node_modules/.pnpm -path '*/prisma/build/index.js' -type f | head -1 | sed 's|/build/index.js||') && \
    ln -s /app/$PRISMA_PKG node_modules/prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["./start.sh"]
