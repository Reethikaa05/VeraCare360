import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMessyDate, parseMessyTime, computeShiftDateTimes, intervalsOverlap } from '../lib/dates.js';

test('parseMessyDate: ISO format', () => {
  assert.deepEqual(parseMessyDate('2026-08-28'), { ok: true, iso: '2026-08-28' });
});

test('parseMessyDate: DD/MM/YYYY format', () => {
  assert.deepEqual(parseMessyDate('05/08/2026'), { ok: true, iso: '2026-08-05' });
});

test('parseMessyDate: MM-DD-YYYY format', () => {
  assert.deepEqual(parseMessyDate('08-13-2026'), { ok: true, iso: '2026-08-13' });
});

test('parseMessyDate: rejects impossible calendar date', () => {
  const r = parseMessyDate('2026-02-30');
  assert.equal(r.ok, false);
});

test('parseMessyDate: rejects missing date', () => {
  assert.equal(parseMessyDate('').ok, false);
  assert.equal(parseMessyDate(undefined).ok, false);
});

test('parseMessyTime: parses "+N day" suffix', () => {
  const r = parseMessyTime('10:00+1');
  assert.equal(r.ok, true);
  assert.equal(r.hh, 10);
  assert.equal(r.extraDays, 1);
});

test('computeShiftDateTimes: overnight shift rolls end date forward', () => {
  const r = computeShiftDateTimes('2026-08-16', '22:00', '06:00');
  assert.equal(r.ok, true);
  assert.equal(r.startDt, '2026-08-16T22:00:00');
  assert.equal(r.endDt, '2026-08-17T06:00:00');
});

test('computeShiftDateTimes: same-day shift stays same day', () => {
  const r = computeShiftDateTimes('2026-08-16', '08:00', '16:00');
  assert.equal(r.endDt, '2026-08-16T16:00:00');
});

test('computeShiftDateTimes: rejects zero-length shift', () => {
  const r = computeShiftDateTimes('2026-08-15', '12:00', '12:00');
  assert.equal(r.ok, false);
});

test('computeShiftDateTimes: rejects missing start time', () => {
  const r = computeShiftDateTimes('2026-08-20', '', '16:00');
  assert.equal(r.ok, false);
});

test('intervalsOverlap: detects overlap and non-overlap correctly', () => {
  assert.equal(intervalsOverlap('2026-08-16T08:00:00', '2026-08-16T16:00:00', '2026-08-16T15:00:00', '2026-08-16T23:00:00'), true);
  assert.equal(intervalsOverlap('2026-08-16T08:00:00', '2026-08-16T16:00:00', '2026-08-16T16:00:00', '2026-08-17T00:00:00'), false);
  assert.equal(intervalsOverlap('2026-08-16T08:00:00', '2026-08-16T16:00:00', '2026-08-17T08:00:00', '2026-08-17T16:00:00'), false);
});
