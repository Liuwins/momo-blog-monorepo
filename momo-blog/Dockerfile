# ===== 构建阶段：vite build =====
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SITE_URL=http://localhost
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ===== 运行阶段：nginx 服务静态文件 =====
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
