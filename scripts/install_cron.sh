#!/usr/bin/env bash

# This script installs a cron job to automatically run the backup.sh script daily.
# It checks if the backup script exists and then adds a cron entry to execute it
# at a specified time (default: 03:00 AM every day).
# It also ensures that duplicate cron entries are not created.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"

# Check if the backup script exists
if [ ! -f "${BACKUP_SCRIPT}" ]; then
    echo "Error: Backup script not found at ${BACKUP_SCRIPT}" >&2
    exit 1
fi

CRON_TIME="0 3 * * *" # Schedule: 03:00 AM every day
CRON_JOB="${CRON_TIME} ${BACKUP_SCRIPT}"

echo "Checking current crontab configuration..."

# Get current crontab entries, suppress errors if crontab is empty
CURRENT_CRON=$(crontab -l 2>/dev/null || true)

# Check if the cron job for the backup script already exists
if echo "${CURRENT_CRON}" | grep -Fq "${BACKUP_SCRIPT}"; then
    echo "Notice: Cron job for ${BACKUP_SCRIPT} already exists. No changes made."
else
    # Add the new cron job to the crontab
    (echo "${CURRENT_CRON}"; echo "${CRON_JOB}") | crontab -
    echo "Success! Cron job automatically added."
    echo "New job schedule: ${CRON_JOB}"
fi