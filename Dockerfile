# Image de déploiement — identique quel que soit l'hébergeur (VM GCP, serveur client…)
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# --- Profil réseau d'entreprise (ex. Proparco / Fortinet) ---
# Si le réseau cible fait de l'inspection SSL, décommenter et fournir le CA :
# COPY certs/corporate-ca.crt /usr/local/share/ca-certificates/
# RUN update-ca-certificates && export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/content ./content
EXPOSE 3000
CMD ["node", "server.js"]
