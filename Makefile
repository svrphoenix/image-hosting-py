# Run for development
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run for production
prod:
	docker compose -f docker-compose.yml up --scale backend=10 -d --build

# Stop everything
down:
	docker compose down