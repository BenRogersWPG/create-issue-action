const assert = require('node:assert/strict');
const { listToArray, parseIssueNumbers } = require('../src/index.js');

assert.deepStrictEqual(listToArray(' 101, 202 , , 303 '), ['101', '202', '303']);
assert.deepStrictEqual(parseIssueNumbers('123, 456'), [123, 456]);
assert.throws(() => parseIssueNumbers('abc,123'), /Invalid related issue number/);

console.log('related issue parsing ok');
