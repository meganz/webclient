#!/usr/bin/env node
/**
 * Simple cleaner to remove falsy statements.
 */

var fs = require('fs');
var input = process.argv[2];
var output = process.argv[3] || input;

var data = fs.readFileSync(input, "utf8");
var dend = data.length;

while (data) {
    var pos = data.indexOf('if (false)');
    if (pos < 0) break;

    if (data.substr(pos-5, 5) == 'else ') {
        pos -= 5;
    }

    var start = pos;
    while (data[--start] !== '\n') {
        if (!/\s/.test(data[start])) {
            ++start;
            break;
        }
    }

    var idx = 0;
    var left = data.substr(0, pos);
    while (++pos < dend) {
        if (data[pos] === '{') {
            ++idx;
        }
        else if (data[pos] === '}') {
            if (!--idx) {
                ++pos;
                break;
            }
        }
    }

    if (data.substr(pos, 5) === ' else') {
        pos += 5;
        if (data[pos] == ' ') {
            pos++;
        }
    }
    else {
        left = data.substr(0, start);
    }

    data = left + data.substr(pos);
}

data = data.replace(/^\s*false\s*\?\s*warning.* : undefined;$/gm, '');

fs.writeFileSync(output, data);
