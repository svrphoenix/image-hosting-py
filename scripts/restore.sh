#!/usr/bin/env bash

# This script restores a PostgreSQL database from a specified backup file.
# It connects to the 'postgres' Docker container and imports the data from the backup.

set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "${SCRIPT_DIR}/.." && pwd)/.env"

if [ ! -f "${ENV_FILE}" ]; then
    echo "ERR: .env file not found at ${ENV_FILE}" >&2
    exit 1
fi

# Function to get environment variables from the .env file
get_env_var() {
    local var_name="$1"
    grep "^${var_name}=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d "'\""
}

# Database credentials and backup directory
DB_USER=$(get_env_var "DB_USER")
DB_NAME=$(get_env_var "DB_NAME")
BACKUP_DIR="./backups"
CONTAINER_NAME="postgres" # Name of the PostgreSQL service container

# Check if a backup filename is provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup_filename.sql>" >&2
    exit 1
fi

filename="$1"
full_path="${BACKUP_DIR}/${filename}"

# Check if the specified backup file exists
if [ ! -f "${full_path}" ]; then
    echo "Error: Backup file not found at ${full_path}" >&2
    exit 1
fi

# Execute psql inside the PostgreSQL container to restore the database
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${full_path}"

echo "Success: Database restored from '${full_path}'"