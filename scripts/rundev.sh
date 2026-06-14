#!/usr/bin/env bash

# This script is used to start the development environment using Docker Compose.
# It uses both docker-compose.yml and docker-compose.dev.yml for development-specific configurations.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build