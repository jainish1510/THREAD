# Build context: repository root (the app reads packages/catalog).
FROM node:22-alpine AS deps
WORKDIR /repo/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/apps/web/node_modules apps/web/node_modules
COPY packages packages
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN cd apps/web && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S thread && adduser -S thread -G thread
COPY --from=build --chown=thread:thread /repo/apps/web/.next/standalone ./
COPY --from=build --chown=thread:thread /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=thread:thread /repo/apps/web/public ./apps/web/public
USER thread
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
