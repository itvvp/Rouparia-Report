# check=skip=SecretsUsedInArgOrEnv
# (VITE_AUTH_URL é um URL público que acaba no bundle; não é um segredo)

# Onde o browser encontra a API. No Coolify define-se como "Build Variable" (e vale tanto para o bundle como para a CSP do nginx).
# - URL da API com domínio próprio (por omissão): precisa de CORS na API e de DNS para esse domínio.
# - "/api": usa o proxy do nginx (mesma origem, sem CORS), com a API só na rede interna.
ARG VITE_AUTH_URL=http://api.rouparia-report.vilavitaparc.com

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* entram no bundle em build
ARG VITE_AUTH_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
RUN npm run build

FROM nginx:1.27-alpine
ARG VITE_AUTH_URL
# - o nginx preenche o template ao arrancar (envsubst só de API_*, para não tocar nos $host/$uri do nginx)
# - API_ORIGIN: o que a CSP deixa o browser contactar (connect-src). Vem do mesmo VITE_AUTH_URL do bundle.
# - API_UPSTREAM: só para o proxy /api/ (modo "/api"): a API na rede interna do Docker (Network Alias da app da API no Coolify).
ENV API_ORIGIN=$VITE_AUTH_URL \
    API_UPSTREAM=http://rouparia-api:8026 \
    NGINX_ENVSUBST_FILTER=^API_
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-security.conf /etc/nginx/snippets/security.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
