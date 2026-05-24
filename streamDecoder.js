const { StringDecoder } = require('string_decoder');
const iconv = require('iconv-lite');

/**
 * Decodes a byte stream without splitting multibyte characters across TCP reads.
 */
function createStreamDecoder(encoding) {
	const normalized = (encoding || 'utf8').toLowerCase();

	if (normalized === 'utf8' || normalized === 'utf-8') {
		const decoder = new StringDecoder('utf8');
		return {
			write: (chunk) => decoder.write(chunk),
			end: () => decoder.end(),
		};
	}

	if (normalized === 'ascii') {
		const decoder = new StringDecoder('ascii');
		return {
			write: (chunk) => decoder.write(chunk),
			end: () => decoder.end(),
		};
	}

	const decoder = iconv.getDecoder(normalized);

	return {
		write: (chunk) => decoder.write(chunk),
		end: () => decoder.end(),
	};
}

module.exports = { createStreamDecoder };
