const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStreamDecoder } = require('../streamDecoder');

test('decodes UTF-8 split across TCP-sized chunks', () => {
	const full = Buffer.from('你说道：hello\n', 'utf8');
	const decoder = createStreamDecoder('utf8');
	const part1 = decoder.write(full.slice(0, 5));
	const part2 = decoder.write(full.slice(5));
	assert.equal(part1 + part2, '你说道：hello\n');
});

test('decodes GBK split across multibyte character boundary', () => {
	const full = Buffer.from([0xc4, 0xe3, 0xba, 0xc3, 0x0a]);
	const decoder = createStreamDecoder('gbk');
	const part1 = decoder.write(full.slice(0, 1));
	const part2 = decoder.write(full.slice(1, 3));
	const part3 = decoder.write(full.slice(3));
	assert.equal(part1 + part2 + part3 + decoder.end(), '你好\n');
});
