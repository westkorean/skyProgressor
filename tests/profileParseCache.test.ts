import assert from 'node:assert/strict';
import test from 'node:test';
import { memoizeProfileParser } from '../lib/profileParseCache.ts';

test('profile parser cache reuses results for the same API object only', () => {
  let calls = 0;
  const parser = memoizeProfileParser((value) => {
    calls += 1;
    return { value };
  });
  const member = { level: 12 };

  const first = parser(member);
  const second = parser(member);
  const third = parser({ level: 12 });

  assert.equal(calls, 2);
  assert.equal(first, second);
  assert.notEqual(second, third);
});

test('profile parser cache safely handles missing primitive data', () => {
  let calls = 0;
  const parser = memoizeProfileParser((value) => {
    calls += 1;
    return value ?? 'missing';
  });

  assert.equal(parser(undefined), 'missing');
  assert.equal(parser(undefined), 'missing');
  assert.equal(calls, 2);
});
