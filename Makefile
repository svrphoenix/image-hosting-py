# Запуск для розробки
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Запуск для проду (10 контейнерів бекенду з балансуванням)
prod:
	docker compose -f docker-compose.yml up --scale backend=10 -d --build

# Зупинити все
down:
	docker-compose down