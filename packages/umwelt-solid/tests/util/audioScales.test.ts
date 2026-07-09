import { test, expect, vi } from 'vitest';
import { AudioEncodingFieldDef, AudioUnitSpec, MeasureType, UmweltDataset, UmweltSpec } from '../../src/types';
import { buildAudioScales } from '../../src/contexts/sonification/AudioScalesContext';

// A minimal spec with one nominal field encoded on `property`, so we can
// characterize how nominal/ordinal fields lower onto continuous audio channels.
function nominalScaleSpec(property: 'pitch' | 'pan', encoding: AudioEncodingFieldDef, type: MeasureType = 'nominal'): UmweltSpec {
  const unit: AudioUnitSpec = { name: 'u', encoding: { [property]: encoding }, traversal: [] };
  return {
    data: { name: 'test' },
    key: ['Cat'],
    fields: [{ name: 'Cat', type, active: true, encodings: [{ unit: 'u', property }] }],
    visual: { units: [], composition: 'layer' },
    audio: { units: [unit], composition: 'concat' },
    text: { structures: {} },
  };
}

const threeCats: UmweltDataset = [{ Cat: 'a' }, { Cat: 'b' }, { Cat: 'c' }];

// Part C regression: scaleOrdinal cycled a 2-value range, collapsing category 3
// onto category 1. A point scale spaces N categories evenly across the extent.
test('3+ nominal categories map to distinct, evenly spaced pitches (no cycling)', () => {
  const spec = nominalScaleSpec('pitch', { field: 'Cat' });
  const { pitch } = buildAudioScales(spec, threeCats, spec.audio.units[0]);
  // default pitch range [48, 84] -> a=48, b=66, c=84
  expect([pitch('a'), pitch('b'), pitch('c')]).toEqual([48, 66, 84]);
  expect(new Set([pitch('a'), pitch('b'), pitch('c')]).size).toBe(3);
});

// Part A: pan's own nominal lowering, default range [-0.9, 0.9].
test('nominal categories map to evenly spaced pan positions', () => {
  const spec = nominalScaleSpec('pan', { field: 'Cat' });
  const { pan } = buildAudioScales(spec, threeCats, spec.audio.units[0]);
  expect([pan('a'), pan('b'), pan('c')]).toEqual([-0.9, 0, 0.9]);
});

// No-change guarantee: for 1–2 categories the point scale coincides with the old
// scaleOrdinal output, so no working sonification changes sound.
test('1 and 2 categories match the previous endpoint behavior', () => {
  const one = nominalScaleSpec('pitch', { field: 'Cat' });
  expect(buildAudioScales(one, [{ Cat: 'a' }], one.audio.units[0]).pitch('a')).toBe(48);

  const two = nominalScaleSpec('pitch', { field: 'Cat' });
  const { pitch } = buildAudioScales(two, [{ Cat: 'a' }, { Cat: 'b' }], two.audio.units[0]);
  expect([pitch('a'), pitch('b')]).toEqual([48, 84]);
});

// An explicit range with exactly one value per category is an author-chosen
// mapping, honored directly.
test('explicit range with one value per category is an exact mapping', () => {
  const spec = nominalScaleSpec('pitch', { field: 'Cat', scale: { range: [50, 60, 70] } });
  const { pitch } = buildAudioScales(spec, threeCats, spec.audio.units[0]);
  expect([pitch('a'), pitch('b'), pitch('c')]).toEqual([50, 60, 70]);
});

// A range whose length matches neither the domain nor a 2-value extent is
// ambiguous: warn and space evenly across [min, max] rather than cycle.
test('mismatched-length range warns and falls back to even spacing', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const spec = nominalScaleSpec('pitch', { field: 'Cat', scale: { range: [50, 60, 70, 80] } });
  const { pitch } = buildAudioScales(spec, threeCats, spec.audio.units[0]);
  // point scale over [50, 80] -> a=50, b=65, c=80
  expect([pitch('a'), pitch('b'), pitch('c')]).toEqual([50, 65, 80]);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});
