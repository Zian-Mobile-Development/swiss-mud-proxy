const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTelnetFilter } = require('../telnetFilter');

test('strips telnet negotiation commands from text stream', () => {
	const filter = createTelnetFilter();
	const input = Buffer.from([
		0x3e,
		0xff,
		0xfb,
		0x01,
		0x20,
		0x68,
		0x70,
	]);

	assert.equal(filter.write(input).toString('utf8'), '> hp');
});

test('strips split telnet negotiation commands', () => {
	const filter = createTelnetFilter();

	assert.equal(filter.write(Buffer.from([0x3e, 0xff])).toString('utf8'), '>');
	assert.equal(filter.write(Buffer.from([0xfd, 0x18, 0x6c])).toString('utf8'), 'l');
});

test('strips telnet subnegotiation blocks', () => {
	const filter = createTelnetFilter();
	const input = Buffer.from([
		0x61,
		0xff,
		0xfa,
		0x18,
		0x01,
		0xff,
		0xf0,
		0x62,
	]);

	assert.equal(filter.write(input).toString('utf8'), 'ab');
});
