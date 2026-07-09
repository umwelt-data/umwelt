import { test, expect } from 'vitest';
import { AudioUnitSpec, UmweltDataset, UmweltSpec } from '../../src/types';
import { getFieldDef, resolveAudioUnitFields, resolveFieldDef } from '../../src/util/spec';
import { getDomain } from '../../src/util/domain';
import { derivedDataset } from '../../src/util/transforms';
import { audioUnitFieldBins } from '../../src/util/ticks';
import { buildAudioScales, audioAxisTicks } from '../../src/contexts/sonification/AudioScalesContext';
import { computeLayerGrid, computeSonifierNotes, SonifierNote, SonifyContext } from '../../src/util/sonify';

// Rebuild the SonifyContext the concat AudioUnitStateProvider builds (no Solid,
// no Tone) so we can characterize the note sequence the runtime schedules.
function buildConcatCtx(spec: UmweltSpec, data: UmweltDataset, unit: AudioUnitSpec): SonifyContext {
  const resolvedFields = resolveAudioUnitFields(spec, unit);
  const fieldBins = audioUnitFieldBins(spec, data, data, resolvedFields);
  const derivedData = derivedDataset(data, resolvedFields, fieldBins);
  const fieldDomains = Object.fromEntries(
    unit.traversal.map((td) => {
      const resolved = resolveFieldDef(getFieldDef(spec, td.field)!, td);
      return [td.field, getDomain(resolved, derivedData, true)];
    })
  );
  const axisTicks = Object.fromEntries(unit.traversal.map((td) => [td.field, audioAxisTicks(spec, data, td.field)]));
  return {
    spec,
    audioUnitSpec: unit,
    derivedData,
    fieldDomains,
    axisTicks,
    scales: buildAudioScales(spec, data, unit),
    pauseBetweenSections: 0.25,
  };
}

const spec: UmweltSpec = {
  data: { name: 'test' },
  key: ['Origin'],
  fields: [
    { name: 'Origin', type: 'nominal', active: true, encodings: [{ unit: 'audio_unit_0', property: 'pitch' }] },
    { name: 'Weight', type: 'quantitative', active: true, encodings: [{ unit: 'audio_unit_0', property: 'pitch' }] },
  ],
  visual: { units: [], composition: 'layer' },
  audio: {
    units: [{ name: 'audio_unit_0', encoding: { pitch: { field: 'Weight', aggregate: 'mean' } }, traversal: [{ field: 'Origin' }] }],
    composition: 'concat',
  },
  text: { structures: {} },
};

// Weight scale domain is the raw extent [10, 60] -> MIDI [48, 84]. getDomain
// sorts the nominal Origin alphabetically -> [Europe, Japan, USA], whose per-group
// means (30, 60, 15) map to pitches (62.4, 84, 51.6).
const data: UmweltDataset = [
  { Origin: 'USA', Weight: 10 },
  { Origin: 'USA', Weight: 20 },
  { Origin: 'Europe', Weight: 30 },
  { Origin: 'Japan', Weight: 60 },
];

const project = (ctx: SonifyContext) =>
  computeSonifierNotes(ctx).map((n) => ({
    state: n.state,
    pitch: n.pitch === undefined ? undefined : Math.round(n.pitch * 100) / 100,
    duration: n.duration,
    volume: n.volume,
    time: Math.round(n.time * 1000) / 1000,
    pauseAfter: n.pauseAfter,
    ramp: n.ramp,
    rest: n.rest,
    speakBefore: n.speakBefore,
  }));

test('computeSonifierNotes characterizes a concat unit note sequence', () => {
  const ctx = buildConcatCtx(spec, data, spec.audio.units[0]);
  // domain order is pinned so the snapshot below is meaningful
  expect(ctx.fieldDomains.Origin).toEqual(['Europe', 'Japan', 'USA']);
  expect(project(ctx)).toEqual([
    { state: { Origin: 0 }, pitch: 62.4, duration: 0.2, volume: -15, time: 0, pauseAfter: 0, ramp: false, rest: false, speakBefore: 'Europe' },
    { state: { Origin: 1 }, pitch: 84, duration: 0.2, volume: -15, time: 0.2, pauseAfter: 0, ramp: false, rest: false, speakBefore: 'Japan' },
    { state: { Origin: 2 }, pitch: 51.6, duration: 0.2, volume: -15, time: 0.4, pauseAfter: 0.25, ramp: false, rest: false, speakBefore: 'USA' },
  ]);
});

test('notes carry a default center pan when pan is unencoded', () => {
  const ctx = buildConcatCtx(spec, data, spec.audio.units[0]);
  expect(computeSonifierNotes(ctx).every((n) => n.pan === 0)).toBe(true);
});

test('notes carry scaled pan from a quantitative pan encoding', () => {
  const panSpec: UmweltSpec = {
    ...spec,
    audio: {
      units: [{ name: 'audio_unit_0', encoding: { pitch: { field: 'Weight', aggregate: 'mean' }, pan: { field: 'Weight', aggregate: 'mean' } }, traversal: [{ field: 'Origin' }] }],
      composition: 'concat',
    },
  };
  const ctx = buildConcatCtx(panSpec, data, panSpec.audio.units[0]);
  // Weight domain is the raw extent [10, 60] -> pan range [-0.9, 0.9]; the per-group
  // means (Europe 30, Japan 60, USA 15) map to (-0.18, 0.9, -0.72).
  const pans = computeSonifierNotes(ctx).map((n) => Math.round(n.pan * 100) / 100);
  expect(pans).toEqual([-0.18, 0.9, -0.72]);
});

// A step-i note for a layer; only the fields computeLayerGrid reads matter here.
const note = (i: number, duration: number, extra: Partial<SonifierNote> = {}): SonifierNote => ({
  state: { Origin: i },
  pitch: 60,
  volume: -15,
  pan: 0,
  duration,
  time: 0, // ignored by the grid
  ...extra,
});

test('computeLayerGrid advances each slot by the longest layer so layers stay locked', () => {
  const grid = computeLayerGrid([
    { voiceId: 'a', notes: [note(0, 0.2), note(1, 0.2), note(2, 0.2, { pauseAfter: 0.25 })] },
    { voiceId: 'b', notes: [note(0, 0.5), note(1, 0.1), note(2, 0.3, { pauseAfter: 0.25 })] },
  ]);

  // slot advance = max layer duration; times accumulate on ONE shared clock.
  // The last step's pauseAfter affects only the end, not any slot's start.
  expect(grid.map((s) => s.slotDuration)).toEqual([0.5, 0.2, 0.3]);
  expect(grid.map((s) => Math.round(s.time * 1000) / 1000)).toEqual([0, 0.5, 0.7]);
  // pauseAfter is shared (read from the first layer) and folded into the advance
  expect(grid.map((s) => s.pauseAfter)).toEqual([0, 0, 0.25]);

  // both layers sound at the SAME slot time (no per-layer drift), each keeping
  // its own duration as the tone length within the slot
  grid.forEach((step) => {
    expect(step.notes.map((n) => n.voiceId)).toEqual(['a', 'b']);
  });
  expect(grid[0].notes.map((n) => n.note.duration)).toEqual([0.2, 0.5]);
});

test('computeSonifierNotes emits a rest (silent, no pitch) for a shared-domain value the unit lacks', () => {
  // Simulate the layer path: the unit indexes a shared traversal domain that
  // includes a value ('Other') absent from this unit's data.
  const base = buildConcatCtx(spec, data, spec.audio.units[0]);
  const ctx: SonifyContext = { ...base, fieldDomains: { Origin: [...base.fieldDomains.Origin, 'Other'] } };
  const notes = computeSonifierNotes(ctx);
  expect(notes).toHaveLength(4);
  const restNote = notes[3];
  expect(restNote.state).toEqual({ Origin: 3 });
  expect(restNote.rest).toBe(true);
  expect(restNote.pitch).toBeUndefined();
  // a rest still occupies a step: default duration, and the earlier notes are unaffected
  expect(restNote.duration).toBe(0.2);
  expect(notes.slice(0, 3).every((n) => n.rest === false)).toBe(true);
});
