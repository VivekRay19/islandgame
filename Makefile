.PHONY: all build-server build-client install-deps deploy clean db-setup

SERVER_DIR     := game-server
CLIENT_DIR     := game-client
STATIC_DIR     := static
DEPLOY_DIR     := /opt/CulturalIslands/cultural-islands
SERVICE_NAME   := cultural-islands
WASM_TARGET    := wasm32-unknown-unknown
WASM_BIN       := cultural_islands_client

all: build-server build-client

install-deps:
	rustup target add $(WASM_TARGET)
	cargo install cargo-watch 2>/dev/null || true

build-server:
	@echo "▶ Building game server..."
	cd $(SERVER_DIR) && cargo build --release
	@echo "✔ Server built → $(SERVER_DIR)/target/release/cultural-islands-server"

build-client:
	@echo "▶ Building WASM game client..."
	cd $(CLIENT_DIR) && cargo build --release --target $(WASM_TARGET)
	cp $(CLIENT_DIR)/target/$(WASM_TARGET)/release/$(WASM_BIN).wasm $(STATIC_DIR)/
	@echo "✔ WASM built → $(STATIC_DIR)/$(WASM_BIN).wasm"

db-setup:
	@echo "▶ Setting up database..."
	psql -U jofrey -c "CREATE DATABASE cultural_islands;" 2>/dev/null || true
	psql -U jofrey -d cultural_islands -f database/001_schema.sql
	psql -U jofrey -d cultural_islands -f database/002_seed.sql
	@echo "✔ Database ready"

deploy: all
	@echo "▶ Deploying to $(DEPLOY_DIR)..."
	sudo mkdir -p $(DEPLOY_DIR)/{static,database}
	sudo cp -r $(STATIC_DIR)/* $(DEPLOY_DIR)/static/
	sudo cp database/*.sql $(DEPLOY_DIR)/database/
	sudo cp .env $(DEPLOY_DIR)/
	sudo cp $(SERVER_DIR)/target/release/cultural-islands-server $(DEPLOY_DIR)/
	sudo cp deploy/cultural-islands.service /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE_NAME)
	sudo systemctl restart $(SERVICE_NAME)
	@echo "✔ Deployed and service started"

watch-server:
	cd $(SERVER_DIR) && cargo watch -x run

clean:
	cargo clean

status:
	sudo systemctl status $(SERVICE_NAME)

logs:
	sudo journalctl -u $(SERVICE_NAME) -f
