# Cultural Islands Game & Server — Deployment & Management Makefile
# Usage:
#   make build          - Build both client (WASM) and server release binary
#   make restart        - Rebuild and restart the systemd service
#   make start / stop   - Start or stop systemd service
#   make status / logs  - Check service status or stream live logs
#   make health         - Verify server health endpoint
#   make db-setup       - Create and seed PostgreSQL database
#   make install        - Install and configure systemd service for current user/directory

# Include .env if present and export all variables so cargo/sqlx receives DATABASE_URL
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

SERVICE       ?= cultural-islands
BINARY        := target/release/$(SERVICE)-server
CLIENT_DIR    := game-client
STATIC_DIR    := static
WASM_TARGET   := wasm32-unknown-unknown
WASM_BIN      := cultural_islands_client.wasm

# Database connection settings (overridden by .env or CLI args)
DBP_USER      ?= jofrey
DBP_PASSWORD  ?= 2025
DBP_HOST      ?= 127.0.0.1
DBP_PORT      ?= 5432
DBP_NAME      ?= cultural_islands

DATABASE_URL  ?= postgres://$(DBP_USER):$(DBP_PASSWORD)@$(DBP_HOST):$(DBP_PORT)/$(DBP_NAME)
export DATABASE_URL

# Systemd deployment detection
DEPLOY_USER   ?= $(if $(SUDO_USER),$(SUDO_USER),$(shell id -un))
DEPLOY_GROUP  ?= $(if $(SUDO_USER),$(shell id -gn $(SUDO_USER)),$(shell id -gn))
CURR_DIR      := $(shell pwd)

.PHONY: all build build-client build-server start stop restart status logs clean health install db-setup db-migrate db-seed help

all: build

## Show help and available commands
help:
	@echo "══════════════════════════════════════════════════════════════════"
	@echo "  Cultural Islands — Makefile Commands"
	@echo "══════════════════════════════════════════════════════════════════"
	@echo "  make build         Build WASM client and Server release binary"
	@echo "  make build-client  Build only WASM client and copy to $(STATIC_DIR)/"
	@echo "  make build-server  Build only Server release binary"
	@echo "  make db-setup      Create DB, configure user password, apply migrations & seed"
	@echo "  make db-migrate    Apply schema migration (001_schema.sql)"
	@echo "  make db-seed       Seed initial data (002_seed.sql)"
	@echo "  make install       Configure and install systemd unit for $(SERVICE)"
	@echo "  make start         Start $(SERVICE) systemd service"
	@echo "  make stop          Stop $(SERVICE) systemd service"
	@echo "  make restart       Rebuild everything and restart $(SERVICE)"
	@echo "  make status        Show systemd service status"
	@echo "  make logs          Follow live service logs (journalctl)"
	@echo "  make health        Check health endpoint (http://127.0.0.1:8067/health)"
	@echo "  make clean         Clean compiled build artifacts"
	@echo "══════════════════════════════════════════════════════════════════"

## Build WASM client and server release binary
build: build-client build-server
	@echo "✓ Full build complete (Client WASM + Server binary)"

## Build WASM client and bundle assets into static/
build-client:
	@echo "▶ Checking wasm target..."
	@rustup target list --installed | grep -q "$(WASM_TARGET)" || rustup target add $(WASM_TARGET)
	@mkdir -p $(STATIC_DIR)
	@if [ ! -f "$(STATIC_DIR)/mq_js_bundle.js" ]; then \
		echo "▶ Downloading Macroquad JS bundle..."; \
		curl -fsSL -o "$(STATIC_DIR)/mq_js_bundle.js" "https://not-fl3.github.io/miniquad-samples/mq_js_bundle.js"; \
	fi
	@echo "▶ Building WASM client (release)..."
	cargo build --release -p cultural_islands_client --target $(WASM_TARGET)
	@cp target/$(WASM_TARGET)/release/$(WASM_BIN) $(STATIC_DIR)/
	@echo "✓ WASM client ready at $(STATIC_DIR)/$(WASM_BIN)"

## Build server release binary
build-server:
	@if [ ! -f .env ]; then \
		echo "▶ Creating .env from .env.example..."; \
		cp .env.example .env; \
	fi
	@echo "▶ Building server (release)..."
	DATABASE_URL="$(DATABASE_URL)" cargo build --release -p $(SERVICE)-server
	@echo "✓ Server binary ready at $(BINARY)"

## Start systemd service
start:
	sudo systemctl start $(SERVICE)
	@echo "✓ $(SERVICE) started"

## Stop systemd service
stop:
	sudo systemctl stop $(SERVICE)
	@echo "✓ $(SERVICE) stopped"

## Rebuild + restart (typical deploy workflow)
restart: build
	sudo systemctl restart $(SERVICE)
	sudo systemctl status $(SERVICE) --no-pager
	@echo "✓ $(SERVICE) restarted with new binary & WASM client"

## Show service status
status:
	sudo systemctl status $(SERVICE) --no-pager

## Stream live logs
logs:
	sudo journalctl -u $(SERVICE) -f

## Remove compiled output
clean:
	cargo clean
	rm -f $(STATIC_DIR)/$(WASM_BIN)
	@echo "✓ target/ and client WASM removed"

## Check health endpoint
health:
	@curl -s http://127.0.0.1:8067/health | (python3 -m json.tool 2>/dev/null || cat) || echo "Server not reachable"

## Setup database (creates user with password and database from DATABASE_URL, runs schema and seed)
db-setup:
	@echo "▶ Reading database configuration from DATABASE_URL..."
	@DB_USER=$$(echo "$$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|'); \
	 DB_PASS=$$(echo "$$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|'); \
	 DB_HOST=$$(echo "$$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|'); \
	 DB_PORT=$$(echo "$$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|'); \
	 DB_NAME=$$(echo "$$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|'); \
	 echo "▶ Configuring PostgreSQL user '$$DB_USER' and database '$$DB_NAME'..."; \
	 sudo -u postgres psql -c "DO \$$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$$DB_USER') THEN CREATE ROLE $$DB_USER LOGIN PASSWORD '$$DB_PASS' SUPERUSER; ELSE ALTER USER $$DB_USER WITH PASSWORD '$$DB_PASS'; END IF; END \$\$;"; \
	 sudo -u postgres psql -c "CREATE DATABASE $$DB_NAME OWNER $$DB_USER;" 2>/dev/null || true; \
	 sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $$DB_NAME TO $$DB_USER;"; \
	 echo "▶ Applying schema migrations (001_schema.sql)..."; \
	 PGPASSWORD="$$DB_PASS" psql -U "$$DB_USER" -h "$$DB_HOST" -p "$$DB_PORT" -d "$$DB_NAME" -f database/001_schema.sql 2>/dev/null || \
	 sudo -u postgres psql -d "$$DB_NAME" -f database/001_schema.sql; \
	 echo "▶ Seeding initial data (002_seed.sql)..."; \
	 PGPASSWORD="$$DB_PASS" psql -U "$$DB_USER" -h "$$DB_HOST" -p "$$DB_PORT" -d "$$DB_NAME" -f database/002_seed.sql 2>/dev/null || \
	 sudo -u postgres psql -d "$$DB_NAME" -f database/002_seed.sql; \
	 echo "✓ Database setup complete for '$$DB_USER' on '$$DB_NAME'"

## Run database schema migrations
db-migrate:
	@DB_USER=$$(echo "$$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|'); \
	 DB_PASS=$$(echo "$$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|'); \
	 DB_NAME=$$(echo "$$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|'); \
	 PGPASSWORD="$$DB_PASS" psql -U "$$DB_USER" -d "$$DB_NAME" -f database/001_schema.sql 2>/dev/null || \
	 sudo -u postgres psql -d "$$DB_NAME" -f database/001_schema.sql

## Seed database with initial story & seasons
db-seed:
	@DB_USER=$$(echo "$$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|'); \
	 DB_PASS=$$(echo "$$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|'); \
	 DB_NAME=$$(echo "$$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|'); \
	 PGPASSWORD="$$DB_PASS" psql -U "$$DB_USER" -d "$$DB_NAME" -f database/002_seed.sql 2>/dev/null || \
	 sudo -u postgres psql -d "$$DB_NAME" -f database/002_seed.sql

## Install systemd unit (first-time setup only, configures user and path automatically)
install:
	@echo "▶ Configuring and installing $(SERVICE) systemd unit..."
	@sed -e 's|User=.*|User=$(DEPLOY_USER)|g' \
	     -e 's|Group=.*|Group=$(DEPLOY_GROUP)|g' \
	     -e 's|WorkingDirectory=.*|WorkingDirectory=$(CURR_DIR)|g' \
	     -e 's|EnvironmentFile=.*|EnvironmentFile=$(CURR_DIR)/.env|g' \
	     -e 's|ExecStart=.*|ExecStart=$(CURR_DIR)/$(BINARY)|g' \
	     deploy/$(SERVICE).service > /tmp/$(SERVICE).service
	sudo mv /tmp/$(SERVICE).service /etc/systemd/system/$(SERVICE).service
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE)
	@echo "✓ $(SERVICE) unit installed and enabled for user $(DEPLOY_USER) at $(CURR_DIR)"
