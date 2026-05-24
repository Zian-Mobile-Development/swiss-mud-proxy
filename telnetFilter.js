const IAC = 255;
const SB = 250;
const SE = 240;

const TWO_BYTE_COMMANDS = new Set([251, 252, 253, 254]);

function createTelnetFilter() {
	let pending = Buffer.alloc(0);
	let inSubnegotiation = false;

	return {
		write(chunk) {
			const input = Buffer.concat([pending, chunk]);
			pending = Buffer.alloc(0);
			const output = [];

			for (let index = 0; index < input.length; index += 1) {
				const byte = input[index];

				if (inSubnegotiation) {
					if (byte !== IAC) continue;
					const command = input[index + 1];
					if (command === undefined) {
						pending = Buffer.from([byte]);
						break;
					}
					index += 1;
					if (command === SE) inSubnegotiation = false;
					continue;
				}

				if (byte !== IAC) {
					output.push(byte);
					continue;
				}

				const command = input[index + 1];
				if (command === undefined) {
					pending = Buffer.from([byte]);
					break;
				}

				if (command === IAC) {
					output.push(IAC);
					index += 1;
					continue;
				}

				if (command === SB) {
					inSubnegotiation = true;
					index += 1;
					continue;
				}

				if (TWO_BYTE_COMMANDS.has(command)) {
					if (input[index + 2] === undefined) {
						pending = input.slice(index);
						break;
					}
					index += 2;
					continue;
				}

				index += 1;
			}

			return Buffer.from(output);
		},
	};
}

module.exports = { createTelnetFilter };
