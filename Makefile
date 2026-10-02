.PHONY: all build-server setup-client download-phaser db-setup deploy
.PHONY: start stop restart status logs clean

# ── Paths ──────────────────────────────────────────────────────────────────────
DEPLOY_DIR   := /opt/islandgame
SERVICE_NAME := cultural-islands
SERVER_BIN   := game-server/target/release/cultural-islands-server
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
	cd game-server && cargo build --release
	@echo "✔ Binary → $(SERVER_BIN)"

# ── 3. Database setup ──────────────────────────────────────────────────────────
db-setup:
	@echo "▶ Creating database and running schema…"
	psql -U jofrey -c "CREATE DATABASE cultural_islands;" 2>/dev/null || true
	psql -U jofrey -d cultural_islands -f database/001_schema.sql
	psql -U jofrey -d cultural_islands -f database/002_seed.sql
	@echo "✔ Database ready"

# ── 4. Deploy (copy files + restart service) ───────────────────────────────────
deploy: all
	@echo "▶ Deploying to $(DEPLOY_DIR)…"
	sudo mkdir -p $(DEPLOY_DIR)/static/js/{scenes,game,ui}
	sudo cp $(SERVER_BIN)           $(DEPLOY_DIR)/
	sudo cp -r static/*             $(DEPLOY_DIR)/static/
	sudo cp .env                    $(DEPLOY_DIR)/
	sudo cp deploy/cultural-islands.service /etc/systemd/system/$(SERVICE_NAME).service
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE_NAME)
	sudo systemctl restart $(SERVICE_NAME)
	@echo "✔ Deployed and service restarted"
	@echo "   Open: http://192.168.8.10:8067"

# ── Quick deploy: only static JS files (no recompile needed) ──────────────────
deploy-client:
	@echo "▶ Syncing static JS client to $(DEPLOY_DIR)/static/…"
	sudo cp -r static/* $(DEPLOY_DIR)/static/
	@echo "✔ JS client deployed — refresh your browser"

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

# ── Dev: run server without systemd ───────────────────────────────────────────
run:
	cd game-server && cargo run

watch:
	cd game-server && cargo watch -x run

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	cargo clean
