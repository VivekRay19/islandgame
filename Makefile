# Cultural Islands Game & Server — Deployment & Management Makefile
# Usage:
#   make build          - Build both client (WASM) and server release binary
#   make restart        - Rebuild and restart the systemd service
#   make start / stop   - Start or stop systemd service
#   make status / logs  - Check service status or stream live logs
#   make health         - Verify server health endpoint
#   make db-setup       - Create and seed PostgreSQL database
#   make install        - Install and configure systemd service for current user/directory

SERVICE       ?= cultural-islands
BINARY        := target/release/$(SERVICE)-server
CLIENT_DIR    := game-client
STATIC_DIR    := static
WASM_TARGET   := wasm32-unknown-unknown
WASM_BIN      := cultural_islands_client.wasm

# Database connection defaults (override via: make db-setup PGUSER=... PGDATABASE=...)
PGUSER        ?= postgres
PGDATABASE    ?= cultural_islands
PGHOST        ?= 127.0.0.1
PGPORT        ?= 5432

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
	@echo "  make db-setup      Create DB, apply schema migrations, and seed data"
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
	@echo "▶ Building server (release)..."
	cargo build --release -p $(SERVICE)-server
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

## Setup database (create DB, run migrations and seed)
db-setup:
	@echo "▶ Setting up database $(PGDATABASE)..."
	@psql -U $(PGUSER) -h $(PGHOST) -p $(PGPORT) -d postgres -c "CREATE DATABASE $(PGDATABASE);" 2>/dev/null || \
	 sudo -u postgres psql -c "CREATE DATABASE $(PGDATABASE);" 2>/dev/null || true
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "✓ Database setup complete"

## Run database schema migrations
db-migrate:
	@echo "▶ Applying schema migrations..."
	@psql -U $(PGUSER) -h $(PGHOST) -p $(PGPORT) -d $(PGDATABASE) -f database/001_schema.sql 2>/dev/null || \
	 sudo -u postgres psql -d $(PGDATABASE) -f database/001_schema.sql

## Seed database with initial story & seasons
db-seed:
	@echo "▶ Seeding initial data..."
	@psql -U $(PGUSER) -h $(PGHOST) -p $(PGPORT) -d $(PGDATABASE) -f database/002_seed.sql 2>/dev/null || \
	 sudo -u postgres psql -d $(PGDATABASE) -f database/002_seed.sql

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
