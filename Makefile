.PHONY: all build-server fmt check source-sanity backend-check client-check precheck db-setup deploy install start stop restart status logs health run watch godot-install godot-editor godot-run clean

DEPLOY_DIR   := /opt/islandgame
SERVICE_NAME := cultural-islands
SERVER_BIN   := target/release/cultural-islands-server
GODOT_VERSION ?= 4.7.2
GODOT_LOCAL   := .tools/godot-$(GODOT_VERSION)/godot
GODOT        ?= $(GODOT_LOCAL)
GODOT_CLIENT := godot-client

all: build-server

build-server:
	@echo "▶ Building game-server (release)…"
	cargo build --release -p cultural-islands-server
	@echo "✔ Binary → $(SERVER_BIN)"

fmt:
	@echo "▶ Checking Rust formatting…"
	cargo fmt --all -- --check

backend-check:
	@echo "▶ Checking Rust workspace…"
	cargo check --workspace --all-targets

source-sanity:
	@echo "▶ Running repository source sanity checks…"
	python3 tools/source_sanity.py

client-check:
	@echo "▶ Checking Godot client scripts…"
	@test -x "$(GODOT)" || (echo "Godot not found at $(GODOT). Run: make godot-install" && exit 1)
	$(GODOT) --headless --path $(GODOT_CLIENT) --editor --quit --check-only

precheck: source-sanity fmt backend-check client-check
	@echo "✔ Rust + Godot prechecks passed"

# Database setup uses the existing prototype schema/seed files.
db-setup:
	@echo "▶ Creating database and running schema…"
	psql -U jofrey -c "CREATE DATABASE cultural_islands;" 2>/dev/null || true
	psql -U jofrey -d cultural_islands -f database/001_schema.sql
	psql -U jofrey -d cultural_islands -f database/002_seed.sql
	@echo "✔ Database ready"

# Backend deployment only. Godot is a separate desktop client.
deploy: all
	@echo "▶ Deploying backend to $(DEPLOY_DIR)…"
	@CURDIR=$$(pwd -P); DDIR=$$(realpath $(DEPLOY_DIR) 2>/dev/null || echo $(DEPLOY_DIR)); \
	if [ "$$CURDIR" = "$$DDIR" ]; then \
	  echo "  (repo IS the deploy dir — skipping file copy)"; \
	else \
	  sudo mkdir -p $(DEPLOY_DIR)/static; \
	  sudo cp $(SERVER_BIN)  $(DEPLOY_DIR)/; \
	  sudo cp -r static/*   $(DEPLOY_DIR)/static/; \
	  sudo cp .env           $(DEPLOY_DIR)/; \
	fi
	@if [ -f deploy/cultural-islands.service ]; then \
	  sudo cp deploy/cultural-islands.service /etc/systemd/system/$(SERVICE_NAME).service; \
	  sudo systemctl daemon-reload; \
	  sudo systemctl enable $(SERVICE_NAME); \
	fi
	sudo systemctl restart $(SERVICE_NAME)
	@echo "✔ Backend deployed and restarted"

install: all
	@echo "▶ First-time backend install to $(DEPLOY_DIR)…"
	sudo mkdir -p $(DEPLOY_DIR)/static
	@CURDIR=$$(pwd -P); DDIR=$$(realpath $(DEPLOY_DIR) 2>/dev/null || echo $(DEPLOY_DIR)); \
	if [ "$$CURDIR" != "$$DDIR" ]; then \
	  sudo cp -r static/* $(DEPLOY_DIR)/static/; \
	  sudo cp $(SERVER_BIN) $(DEPLOY_DIR)/; \
	  [ -f .env ] && sudo cp .env $(DEPLOY_DIR)/; \
	fi
	@if [ -f deploy/cultural-islands.service ]; then \
	  sudo cp deploy/cultural-islands.service /etc/systemd/system/$(SERVICE_NAME).service; \
	  sudo systemctl daemon-reload; \
	  sudo systemctl enable $(SERVICE_NAME); \
	fi
	@echo "✔ Installed. Run 'make start' to launch."

start:
	sudo systemctl start $(SERVICE_NAME)
stop:
	sudo systemctl stop $(SERVICE_NAME)
restart:
	sudo systemctl restart $(SERVICE_NAME)
status:
	sudo systemctl status $(SERVICE_NAME)
logs:
	sudo journalctl -u $(SERVICE_NAME) -f
health:
	@curl -sf http://127.0.0.1:8067/health && echo " ✔ Healthy" || echo " ✘ Unreachable"
run:
	@if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet $(SERVICE_NAME) 2>/dev/null; then \
		echo "$(SERVICE_NAME) is already running on the configured port."; \
		echo "Use 'make status' / 'make logs', or run 'make stop' before 'make run'."; \
		exit 1; \
	fi
	cargo run -p cultural-islands-server
watch:
	cargo watch -x 'run -p cultural-islands-server'

godot-install:
	bash tools/install_godot.sh

godot-editor:
	@if [ ! -x "$(GODOT)" ]; then \
	  if [ -x ".tools/godot-4.7.2/godot" ]; then \
	    echo "Using local Godot: .tools/godot-4.7.2/godot"; \
	    .tools/godot-4.7.2/godot --editor --path $(GODOT_CLIENT); \
	  else \
	    echo "Godot not found. Run: make godot-install"; exit 1; \
	  fi; \
	else \
	  $(GODOT) --editor --path $(GODOT_CLIENT); \
	fi

godot-run:
	@if [ ! -x "$(GODOT)" ]; then \
	  if [ -x ".tools/godot-4.7.2/godot" ]; then \
	    echo "Using local Godot: .tools/godot-4.7.2/godot"; \
	    .tools/godot-4.7.2/godot --path $(GODOT_CLIENT); \
	  else \
	    echo "Godot not found. Run: make godot-install"; exit 1; \
	  fi; \
	else \
	  $(GODOT) --path $(GODOT_CLIENT); \
	fi

clean:
	cargo clean

