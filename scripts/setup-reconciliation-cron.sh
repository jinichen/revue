#!/bin/bash
# 对账单自动生成定时任务安装脚本

# 获取当前项目的绝对路径
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
echo "项目目录: $PROJECT_DIR"

# 从.env.local获取定时任务执行时间
ENV_FILE="$PROJECT_DIR/.env.local"
if [ -f "$ENV_FILE" ]; then
  # 提取执行时间
  TIME=$(grep RECONCILIATION_AUTO_GENERATE_TIME "$ENV_FILE" | cut -d= -f2)
  # 移除可能存在的引号和空格
  TIME=$(echo "$TIME" | tr -d "\"' ")
else
  # 默认执行时间
  TIME="01:00"
fi

# 解析小时和分钟
HOUR=$(echo "$TIME" | cut -d: -f1)
MINUTE=$(echo "$TIME" | cut -d: -f2)

echo "设置对账单生成定时任务，执行时间为每天 $TIME"

# 创建临时的crontab文件
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# 检查是否已经存在相同的任务
if grep -q "reconciliation-exporter.ts" "$TEMP_CRON"; then
  echo "检测到已存在对账单生成定时任务，将先移除旧任务"
  grep -v "reconciliation-exporter.ts" "$TEMP_CRON" > "${TEMP_CRON}.new"
  mv "${TEMP_CRON}.new" "$TEMP_CRON"
fi

# 添加新的定时任务
echo "# 每天 $TIME 自动生成前一天的对账单" >> "$TEMP_CRON"
echo "$MINUTE $HOUR * * * cd $PROJECT_DIR && /usr/bin/env node --require ts-node/register $PROJECT_DIR/scripts/reconciliation-exporter.ts >> $PROJECT_DIR/logs/reconciliation-$(date +\%Y\%m\%d).log 2>&1" >> "$TEMP_CRON"

# 安装新的crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# 确保日志目录存在
mkdir -p "$PROJECT_DIR/logs"

echo "定时任务已设置成功！"
echo "对账单将会在每天 $TIME 自动生成，并保存到环境变量中配置的目录"
echo "查看当前的crontab配置："
crontab -l | grep reconciliation 