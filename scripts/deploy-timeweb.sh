#!/usr/bin/env bash
# Выкладка на обычный хостинг с PHP (Таймвеб): сборка фронтенда + PHP-API, загрузка по SSH.
# Фото из админки (uploads), база и config.php на сервере сохраняются.
#
#   scripts/deploy-timeweb.sh            — обновить сайт
#   scripts/deploy-timeweb.sh --init-db  — первый запуск: залить чистую базу (если её на сервере ещё нет)
#
# Настройки: DEPLOY_HOST (по умолчанию cy02031@vh272.timeweb.ru), DEPLOY_DIR (pro-orgazm.ru)
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-cy02031@vh272.timeweb.ru}"
DIR="${DEPLOY_DIR:-pro-orgazm.ru}"
SSH=(ssh -o BatchMode=yes "$HOST")

npm run build
cp -R php/api php/uploads php/legacy.php php/sitemap.php dist/
cp src/lib/seo-defaults.json dist/
node scripts/legacy-map.mjs dist/legacy-map.json

if [[ "${1:-}" == "--init-db" ]]; then
  if "${SSH[@]}" "test -f ~/$DIR/data/proorgazm.db"; then
    echo "База на сервере уже есть — не трогаю"
  else
    tmp="$(mktemp -d)"
    node --no-warnings=ExperimentalWarning scripts/build-db.mjs "$tmp/proorgazm.db"
    "${SSH[@]}" "mkdir -p ~/$DIR/data && chmod 700 ~/$DIR/data"
    scp -q -o BatchMode=yes "$tmp/proorgazm.db" "$HOST:$DIR/data/proorgazm.db"
    rm -rf "$tmp"
  fi
fi

"${SSH[@]}" "test -f ~/$DIR/config.php" || { echo "Нет ~/$DIR/config.php на сервере — см. php/config.example.php"; exit 1; }

# Загружаем в новую папку и подменяем целиком; uploads переносим из старой
COPYFILE_DISABLE=1 tar czf - -C dist . | "${SSH[@]}" "set -e
  cd ~/$DIR
  rm -rf public_html.new && mkdir public_html.new
  tar xzf - -C public_html.new
  find public_html.new -type d -exec chmod 755 {} +
  find public_html.new -type f -exec chmod 644 {} +
  if [ -d public_html/uploads ]; then
    find public_html/uploads -maxdepth 1 -type f ! -name .htaccess -exec mv {} public_html.new/uploads/ \;
  fi
  rm -rf public_html.old
  [ -d public_html ] && mv public_html public_html.old
  mv public_html.new public_html
  rm -rf public_html.old
  chmod 600 config.php"

# Обновления схемы базы (идемпотентно)
"${SSH[@]}" "cd ~/$DIR/public_html && php api/index.php migrate"

echo "Готово: https://$DIR/"
