.PHONY: all build-server setup-client download-phaser db-setup deploy deploy-client
.PHONY: start stop restart status logs clean run watch install

# ── Paths ──────────────────────────────────────────────────────────────────────
DEPLOY_DIR   := /opt/islandgame
SERVICE_NAME := cultural-islands
# Workspace Cargo.toml places the binary under the WORKSPACE root target/
SERVER_BIN   := target/release/cultural-islands-server
PHASER_VER   := 3.88.0
PHASER_URL   := https://cdnjs.cloudflare.com/ajax/libs/phaser/$(PHASER_VER)/phaser.min.js
PHASER_DST   := static/phaser.min.js

# ── Default target ─────────────────────────────────────────────────────────────
all: download-phaser build-server

# ── 1. Download Phaser 3 locally (run once) ────────────────────────────────────
download-phaser:
	@if [ ! -f "$(PHASER_DST)" ]; then \
	  echo "▶ Downloading Phaser $(PHASER_VER)…"; \
	  curl -fsSL -o "$(PHASER_DST)" "$(PHASER_URL)" && \
	  echo "✔ Phaser saved to $(PHASER_DST)" || \
	  echo "✘ Download failed — copy phaser.min.js to static/ manually"; \
	else \
	  echo "✔ $(PHASER_DST) already present"; \
	fi

# ── 2. Build the Rust API server ───────────────────────────────────────────────
build-server:
	@echo "▶ Building game-server (release)…"
	cargo build --release -p cultural-islands-server
	@echo "✔ Binary → $(SERVER_BIN)"

# ── 3. Database setup ──────────────────────────────────────────────────────────
db-setup:
	@echo "▶ Creating database and running schema…"
	psql -U jofrey -c "CREATE DATABASE cultural_islands;" 2>/dev/null || true
	psql -U jofrey -d cultural_islands -f database/001_schema.sql
	psql -U jofrey -d cultural_islands -f database/002_seed.sql
	@echo "✔ Database ready"

# ── 4. Deploy (copy files + restart service) ───────────────────────────────────
# Handles the case where the repo IS the deploy dir (running from /opt/islandgame)
deploy: all
	@echo "▶ Deploying to $(DEPLOY_DIR)…"
	@CURDIR=$$(pwd -P); DDIR=$$(realpath $(DEPLOY_DIR) 2>/dev/null || echo $(DEPLOY_DIR)); \
	if [ "$$CURDIR" = "$$DDIR" ]; then \
	  echo "  (repo IS the deploy dir — skipping file copy)"; \
	else \
	  sudo mkdir -p $(DEPLOY_DIR)/static/js/{scenes,game,ui}; \
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
	@echo "✔ Deployed and service restarted"
	@echo "   Open: http://192.168.8.10:8067"

# ── Quick deploy: only static JS files (no recompile needed) ──────────────────
deploy-client:
	@CURDIR=$$(pwd -P); DDIR=$$(realpath $(DEPLOY_DIR) 2>/dev/null || echo $(DEPLOY_DIR)); \
	if [ "$$CURDIR" = "$$DDIR" ]; then \
	  echo "✔ Repo IS the deploy dir — static files already in place, just refresh browser"; \
	else \
	  echo "▶ Syncing static JS client to $(DEPLOY_DIR)/static/…"; \
	  sudo cp -r static/* $(DEPLOY_DIR)/static/; \
	  echo "✔ JS client deployed — refresh your browser"; \
	fi

# ── Install: first-time systemd setup ─────────────────────────────────────────
install: all
	@echo "▶ First-time install to $(DEPLOY_DIR)…"
	sudo mkdir -p $(DEPLOY_DIR)/static/js/{scenes,game,ui}
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

# ── Service management ─────────────────────────────────────────────────────────
start:
	sudo systemctl start  $(SERVICE_NAME)
stop:
	sudo systemctl stop   $(SERVICE_NAME)
restart:
	sudo systemctl restart $(SERVICE_NAME)
status:
	sudo systemctl status  $(SERVICE_NAME)
logs:
	sudo journalctl -u $(SERVICE_NAME) -f
health:
	@curl -sf http://127.0.0.1:8067/health && echo " ✔ Healthy" || echo " ✘ Unreachable"

# ── Dev: run server without systemd ───────────────────────────────────────────
run:
	cargo run -p cultural-islands-server

watch:
	cargo watch -x 'run -p cultural-islands-server'

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	cargo clean
