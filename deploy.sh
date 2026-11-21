#!/usr/bin/env bash
# Deploys the module to a Zabbix frontend host over SSH (tar, no rsync needed) and reloads PHP-FPM.
#
# Configure once, either via environment variables or a git-ignored ./.deploy.env file:
#   ZBX_HOST=user@zabbix.example.com      (required, user needs passwordless sudo)
#   ZBX_UI_DIR=/usr/share/zabbix/ui       (frontend root; Debian/Ubuntu packages default)
#   ZBX_FPM=php8.4-fpm                    (service to reload; empty = skip)
# Your local config.json on the server is preserved across deployments.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .deploy.env ] && . ./.deploy.env

: "${ZBX_HOST:?Set ZBX_HOST=user@host (env or .deploy.env)}"
UI_DIR="${ZBX_UI_DIR:-/usr/share/zabbix/ui}"
FPM="${ZBX_FPM-php8.4-fpm}"
DEST="${UI_DIR%/}/modules/rackmap"

COPYFILE_DISABLE=1 tar --no-xattrs \
  --exclude './.git' --exclude './deploy.sh' --exclude './README.md' --exclude './docs' --exclude './CHANGELOG.md' --exclude './LICENSE' --exclude './.deploy.env' \
  --exclude './.gitignore' --exclude './config.json' --exclude '.DS_Store' \
  -cf - . | ssh "${ZBX_HOST}" "
    set -e
    tmp=\$(mktemp)
    if [ -f '${DEST}/config.json' ]; then sudo cp '${DEST}/config.json' \"\$tmp\"; keep=1; fi
    sudo rm -rf -- '${DEST}'
    sudo mkdir -p '${DEST}'
    sudo tar -xf - -C '${DEST}'
    if [ -n \"\${keep:-}\" ]; then sudo cp \"\$tmp\" '${DEST}/config.json'; fi
    rm -f \"\$tmp\"
    sudo chown -R root:root '${DEST}'
    sudo find '${DEST}' -type d -exec chmod 755 {} +
    sudo find '${DEST}' -type f -exec chmod 644 {} +
    if [ -n '${FPM}' ]; then sudo systemctl reload '${FPM}'; fi
    sudo ls -R '${DEST}' | head -30
  "
echo "OK: module deployed to ${DEST} on ${ZBX_HOST}"
