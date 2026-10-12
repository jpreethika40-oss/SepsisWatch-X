# =============================================================================
# SepsisWatch-X: Platform Orchestration Makefile
# =============================================================================

.PHONY: help install test build run run-frontend docker-build docker-run compose-up seed-db clean

help:
	@echo "SepsisWatch-X - Development & Deployment Commands:"
	@echo "  make install        - Install Python and Node.js dependencies"
	@echo "  make seed-db        - Seed database with 12 ICU beds"
	@echo "  make test           - Run full 33-test pytest regression suite"
	@echo "  make build          - Build production 3D React frontend"
	@echo "  make run            - Launch FastAPI backend & Gradio on port 8000"
	@echo "  make run-frontend   - Launch Vite development server on port 5173"
	@echo "  make docker-build   - Build multi-stage Docker image (port 7860)"
	@echo "  make docker-run     - Run Docker container locally on port 7860"
	@echo "  make compose-up     - Start all services with docker-compose"
	@echo "  make clean          - Remove temporary build artifacts and caches"

install:
	pip install -r requirements.txt
	cd frontend && npm install

seed-db:
	python scripts/seed_db.py

test:
	python -m pytest tests/ -v

build:
	cd frontend && npm run build

run:
	uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev

docker-build:
	docker build -t sepsiswatch-x:latest .

docker-run:
	docker run -p 7860:7860 --name sepsiswatch-x-live sepsiswatch-x:latest

compose-up:
	docker compose up --build

clean:
	rm -rf frontend/dist __pycache__ .pytest_cache
