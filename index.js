const WebSocket = require('ws');
const net = require('net');
const http = require('http');
const iconv = require('iconv-lite');
const AnsiToHtml = require('ansi-to-html');
const he = require('he');
const { createStreamDecoder } = require('./streamDecoder');

const WS_PORT = Number(process.env.PORT || 3000);
const WS_HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
	if (req.url === '/healthz') {
		res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('ok\n');
		return;
	}

	if (req.url === '/' || req.url === '/favicon.ico') {
		const body = JSON.stringify({
			name: 'swiss-mud-proxy',
			status: 'ok',
			websocketUrl: `wss://${req.headers.host || 'swiss-mud-proxy.fly.dev'}`,
		});

		res.writeHead(req.url === '/' ? 200 : 204, {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
		});
		res.end(req.url === '/' ? `${body}\n` : '');
		return;
	}

	res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end('not found\n');
});

const wss = new WebSocket.Server({ server });

function toHtmlChunk(text, ansiToHtml, encoding) {
	if (!text) return '';
	let html = ansiToHtml.toHtml(text);
	if (encoding !== 'utf8') {
		html = he.decode(html);
	}
	return html;
}

wss.on('connection', (ws) => {
	console.log('WebSocket client connected');
	let mudSocket = null;

	ws.once('message', (msg) => {
		let profile;
		try {
			profile = JSON.parse(msg);
		} catch {
			ws.close();
			return;
		}

		const encoding = profile.encoding || 'utf8';
		const streamDecoder = createStreamDecoder(encoding);
		const ansiToHtml = new AnsiToHtml({
			escapeXML: true,
			stream: true,
		});

		mudSocket = net.createConnection(
			{ host: profile.address, port: Number(profile.port) },
			() => ws.send('[INFO] Connected to MUD server')
		);

		// Stream decoded text through ANSI→HTML; do not split on TCP chunk boundaries.
		mudSocket.on('data', (data) => {
			try {
				const text = streamDecoder.write(data);
				const html = toHtmlChunk(text, ansiToHtml, encoding);
				if (html) ws.send(html);
			} catch (err) {
				console.error('Error decoding MUD data:', err);
				ws.send(`[ERROR] Failed to decode MUD data: ${err.message}`);
			}
		});

		mudSocket.on('close', () => {
			try {
				const tail = streamDecoder.end();
				const html = toHtmlChunk(tail, ansiToHtml, encoding);
				if (html) ws.send(html);
			} catch (err) {
				console.error('Error flushing MUD stream:', err);
			}
			ws.close();
			console.log('MUD connection closed');
		});

		mudSocket.on('error', (err) => {
			ws.send(`[MUD ERROR] ${err.message}`);
			ws.close();
			console.error('MUD socket error:', err);
		});

		ws.on('message', (message) => {
			try {
				const encodedMessage = iconv.encode(message.toString(), encoding);
				mudSocket.write(encodedMessage);
			} catch (err) {
				console.error('Error encoding message:', err);
				ws.send(`[ERROR] Failed to encode message: ${err.message}`);
			}
		});

		ws.on('close', () => {
			mudSocket.end();
			console.log('WebSocket client disconnected');
		});

		ws.on('error', (err) => {
			mudSocket.end();
			console.error('WebSocket error:', err);
		});
	});
});

server.listen(WS_PORT, WS_HOST, () => {
	console.log(`WebSocket-to-TCP proxy running on ws://${WS_HOST}:${WS_PORT}`);
});
