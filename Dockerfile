# MyBlog 全栈 Docker 镜像
# 包含前端、后端和 Cloudflare 内网穿透

FROM node:20-alpine

# 安装必要工具
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    bash \
    supervisor \
    # better-sqlite3 编译依赖
    build-base \
    python3-dev

# 安装 cloudflared
RUN curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared

# 安装 Python 依赖（用于生成二维码）
RUN pip3 install qrcode pillow --break-system-packages

# 设置工作目录
WORKDIR /app

# 复制 package.json 并安装依赖（利用 Docker 缓存）
COPY server/package*.json ./server/
COPY web/package*.json ./web/

RUN cd /app/server && npm install
RUN cd /app/web && npm install

# 复制项目文件
COPY server/ ./server/
COPY web/ ./web/
COPY public-address.py ./

# 创建数据目录
RUN mkdir -p /app/server/db /app/logs

# 创建启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 创建 supervisord 配置
COPY supervisord.conf /etc/supervisord.conf

# 暴露端口
EXPOSE 3001 5174

# 设置环境变量
ENV NODE_ENV=production
ENV ENABLE_TUNNEL=true
ENV SHELL=/bin/bash
ENV AUTO_START_CLAUDE=false

# 启动入口
ENTRYPOINT ["/docker-entrypoint.sh"]
