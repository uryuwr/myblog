#!/bin/bash
set -e

echo "============================================"
echo "  MyBlog Docker 启动脚本"
echo "============================================"
echo ""

# 清理旧日志
rm -f /app/logs/tunnel_*.log

# 如果启用隧道模式
if [ "$ENABLE_TUNNEL" = "true" ]; then
    echo "[1/5] 启动后端服务..."
    cd /app/server
    node index.js &
    BACKEND_PID=$!
    sleep 2
    echo "  后端已启动 (端口 3001, PID: $BACKEND_PID)"
    echo ""

    echo "[2/5] 启动后端隧道 (端口 3001)..."
    cloudflared tunnel --url http://localhost:3001 > /app/logs/tunnel_3001.log 2>&1 &
    TUNNEL_3001_PID=$!

    echo "[3/5] 启动前端隧道 (端口 5174)..."
    cloudflared tunnel --url http://localhost:5174 > /app/logs/tunnel_5174.log 2>&1 &
    TUNNEL_5174_PID=$!

    echo "[4/5] 等待隧道创建并获取公网地址..."
    MAX_ATTEMPTS=60
    ATTEMPT=0
    SERVER_URL=""

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        
        # 尝试从日志中提取 URL
        if [ -f /app/logs/tunnel_3001.log ]; then
            SERVER_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /app/logs/tunnel_3001.log | head -1)
        fi
        
        if [ -n "$SERVER_URL" ]; then
            break
        fi
        
        echo "  等待隧道创建... ($ATTEMPT/$MAX_ATTEMPTS)"
        sleep 1
    done

    if [ -z "$SERVER_URL" ]; then
        echo "[错误] 获取后端公网地址超时"
        cat /app/logs/tunnel_3001.log 2>/dev/null || true
        exit 1
    fi

    echo "  后端公网地址: $SERVER_URL"
    echo ""

    # 等待前端隧道
    ATTEMPT=0
    WEB_URL=""
    while [ $ATTEMPT -lt 30 ]; do
        ATTEMPT=$((ATTEMPT + 1))
        
        if [ -f /app/logs/tunnel_5174.log ]; then
            WEB_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /app/logs/tunnel_5174.log | head -1)
        fi
        
        if [ -n "$WEB_URL" ]; then
            break
        fi
        
        sleep 1
    done

    if [ -z "$WEB_URL" ]; then
        echo "  [警告] 未获取到前端隧道地址"
        WEB_URL="http://localhost:5174"
    fi

    echo "  前端公网地址: $WEB_URL"
    echo ""

    # 更新前端环境变量
    echo "[5/5] 更新前端配置并启动..."
    echo "VITE_API_URL=$SERVER_URL/api" > /app/web/.env

    cd /app/web
    npm run dev -- --host 0.0.0.0 &
    FRONTEND_PID=$!

    echo ""
    echo "============================================"
    echo "  部署完成！"
    echo "============================================"
    echo ""
    echo "  后端地址: $SERVER_URL"
    echo "  前端地址: http://localhost:5174"
    echo "  公网访问: $WEB_URL"
    echo ""

    # 生成二维码
    if [ -f /app/public-address.py ]; then
        cd /app
        python3 public-address.py "$WEB_URL" 2>/dev/null || true
    fi

    echo ""
    echo "  服务运行中，按 Ctrl+C 停止..."
    echo ""

    # 保持容器运行
    wait $FRONTEND_PID

else
    # 不启用隧道，使用 supervisord 管理服务
    echo "  隧道模式已禁用，仅启动本地服务..."
    echo ""
    
    # 使用传入的 API URL 或默认值
    if [ -n "$VITE_API_URL" ]; then
        echo "VITE_API_URL=$VITE_API_URL" > /app/web/.env
    else
        echo "VITE_API_URL=http://localhost:3001/api" > /app/web/.env
    fi
    
    exec /usr/bin/supervisord -c /etc/supervisord.conf
fi
