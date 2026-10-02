# Cultural Islands - fix pack

Run on the server, from /opt/islandgame:

    unzip -o ~/IslandGame-fixes.zip -d /opt/islandgame
    chmod +x game-client/build.sh

    # remove leftovers that caused the blank page
    rm -f index.html vite.config.ts package.json package-lock.json tsconfig.json static/mq_js_bundle.js

    grep STATIC_DIR .env          # must say STATIC_DIR=./static  (or be absent)
    make restart                  # rebuilds WASM + server, restarts the service

Verify:

    curl -s http://localhost:8067/ | grep -c "gl.js"                       # expect 1
    curl -sI http://localhost:8067/cultural_islands_client.wasm | head -5  # expect 200 + application/wasm
    make logs                                                              # first lines now print "Static -> /opt/islandgame/static"

Then hard-refresh the browser (Ctrl+F5).
