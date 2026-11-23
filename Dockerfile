# check=skip=SecretsUsedInArgOrEnv
# (VITE_AUTH_URL é um URL público que acaba no bundle; não é um segredo)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* entram no bundle em build: no Coolify define-se como "Build Variable".
# "/api" = o proxy do nginx abaixo (mesma origem: cookies do mesmo site, sem CORS).
ARG VITE_AUTH_URL=/api
ENV VITE_AUTH_URL=$VITE_AUTH_URL
RUN npm run build

FROM nginx:1.27-alpine
# - o nginx preenche o template ao arrancar (envsubst só de API_*, para não tocar nos $host/$uri do nginx)
# - API_UPSTREAM: a API na rede interna do Docker (no Coolify, o Network Alias da app da API). Muda-se aqui ou como variável de runtime.
ENV API_UPSTREAM=http://rouparia-api:8026 \
    NGINX_ENVSUBST_FILTER=^API_
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY nginx-security.conf /etc/nginx/snippets/security.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
