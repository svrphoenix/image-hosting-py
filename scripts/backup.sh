#!/usr/bin/env bash

# This script performs a backup of the PostgreSQL database.
# It connects to the 'postgres' Docker container, dumps the specified database,
# and stores the backup file in the './backups' directory.
# It also cleans up old backup files based on a retention policy.

set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "${SCRIPT_DIR}/.." && pwd)/.env"

if [ ! -f "${ENV_FILE}" ]; then
    echo "ERR: File .env not found at: ${ENV_FILE}"
    exit 1
fi

# Function to get environment variables from the .env file
get_env_var() {
    local var_name="$1"
    grep "^${var_name}=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d "'\""
}

# Database credentials and backup settings
DB_USER=$(get_env_var "DB_USER")
DB_NAME=$(get_env_var "DB_NAME")
BACKUP_DIR="./backups"
CONTAINER_NAME="postgres" # Name of the PostgreSQL service container
RETENTION_DAYS=14 # Number of days to retain backup files

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate timestamp for the backup filename
ts=$(date +%Y-%m-%d_%H-%M-%S)
filename="backup_${ts}.sql"
full_path="${BACKUP_DIR}/${filename}"

echo "Starting backup for database: ${DB_NAME}..."

# Execute pg_dump inside the PostgreSQL container and save to host
docker exec -i "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${full_path}"

echo "Success! Backup created on host: '${full_path}'"

echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
# Find and delete backup files older than RETENTION_DAYS
find "${BACKUP_DIR}" -type f -name "backup_*.sql" -mtime +"${RETENTION_DAYS}" -delete

echo "Backup process finished successfully."