#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"

if [ ! -f "${BACKUP_SCRIPT}" ]; then
    echo "Error: Backup script not found at ${BACKUP_SCRIPT}" >&2
    exit 1
fi

CRON_TIME="0 3 * * *"
CRON_JOB="${CRON_TIME} ${BACKUP_SCRIPT}"

echo "Checking current crontab configuration..."

CURRENT_CRON=$(crontab -l 2>/dev/null || true)

if echo "${CURRENT_CRON}" | grep -Fq "${BACKUP_SCRIPT}"; then
    echo "Notice: Cron job for ${BACKUP_SCRIPT} already exists. No changes made."
else
    (echo "${CURRENT_CRON}"; echo "${CRON_JOB}") | crontab -
    echo "Success! Cron job automatically added."
    echo "New job schedule: ${CRON_JOB}"
fi