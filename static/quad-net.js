// quad-net 0.1.2 browser plugin (HTTP + WebSocket) for miniquad/macroquad.
// Based on the upstream js/quad-net.js, with two fixes:
//   * non-2xx responses (400/401/403/404...) are delivered to Rust, so the
//     game can show the server's JSON error instead of hanging forever;
//   * network failures / timeouts are delivered as a JSON error body, so the
//     UI never gets stuck on "Loading...".
// Must be loaded AFTER gl.js and sapp_jsutils.js.

function on_init() {
}

var register_plugin = function (importObject) {
    importObject.env.ws_connect = ws_connect;
    importObject.env.ws_is_connected = ws_is_connected;
    importObject.env.ws_send = ws_send;
    importObject.env.ws_try_recv = ws_try_recv;

    importObject.env.http_make_request = http_make_request;
    importObject.env.http_try_recv = http_try_recv;
}

miniquad_add_plugin({ register_plugin, on_init, version: 1, name: "quad_net" });

var quad_socket;
var connected = 0;
var received_buffer = [];

function ws_is_connected() {
    return connected;
}

function ws_connect(addr) {
    quad_socket = new WebSocket(consume_js_object(addr));
    quad_socket.binaryType = 'arraybuffer';
    quad_socket.onopen = function () {
        connected = 1;
    };
    quad_socket.onclose = function () {
        connected = 0;
    };

    quad_socket.onmessage = function (msg) {
        if (typeof msg.data == "string") {
            received_buffer.push({ "text": 1, "data": msg.data });
        } else {
            received_buffer.push({ "text": 0, "data": new Uint8Array(msg.data) });
        }
    };
}

function ws_send(data) {
    var array = consume_js_object(data);
    if (array.buffer != undefined) {
        quad_socket.send(array.buffer);
    } else {
        quad_socket.send(array);
    }
}

function ws_try_recv() {
    if (received_buffer.length != 0) {
        return js_object(received_buffer.shift());
    }
    return -1;
}

var uid = 0;
var ongoing_requests = {};

function http_try_recv(cid) {
    if (ongoing_requests[cid] != undefined && ongoing_requests[cid] != null) {
        var data = ongoing_requests[cid];
        ongoing_requests[cid] = null;
        return js_object(data);
    }
    return -1;
}

function http_error_body(message) {
    return new TextEncoder().encode(JSON.stringify({ success: false, error: message }));
}

function http_make_request(scheme, url, body, headers) {
    var cid = uid;
    uid += 1;

    var scheme_string = 'GET';
    if (scheme == 0) {
        scheme_string = 'POST';
    } else if (scheme == 1) {
        scheme_string = 'PUT';
    } else if (scheme == 2) {
        scheme_string = 'GET';
    } else if (scheme == 3) {
        scheme_string = 'DELETE';
    }

    var url_string = consume_js_object(url);
    var body_string = consume_js_object(body);
    var headers_obj = consume_js_object(headers);

    var xhr = new XMLHttpRequest();
    xhr.open(scheme_string, url_string, true);
    xhr.responseType = 'arraybuffer';
    xhr.timeout = 15000;
    for (const header in headers_obj) {
        xhr.setRequestHeader(header, headers_obj[header]);
    }
    xhr.onload = function () {
        if (this.status < 200 || this.status >= 300) {
            console.warn("HTTP " + this.status + " from " + url_string);
        }
        ongoing_requests[cid] = new Uint8Array(this.response);
    };
    xhr.onerror = function () {
        console.error("Failed to make HTTP request to: " + url_string);
        ongoing_requests[cid] = http_error_body("Cannot reach the game server.");
    };
    xhr.ontimeout = function () {
        ongoing_requests[cid] = http_error_body("Server timed out.");
    };

    xhr.send(scheme_string === 'GET' ? null : body_string);
    return cid;
}
