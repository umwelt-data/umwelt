import { For, Show, createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, AudioUnitSpec, audioPropNames, instrumentNames, isAudioProp, isInstrumentName } from '../../types';
import { EncodingDefinition } from './encodingDefinition';
import { TraversalDefinition } from './traversalDefinition';
import ReorderableList from '../ui/ReorderableList';
import { EncodingRow, EnumeratedItem, InputRow } from '../ui/styled';
import { instrumentForIndex, useAudioEngine } from '../../contexts/sonification/AudioEngineContext';

// An isolated voice for editor previews so it never collides with the viewer's
// playback voices. Preview plays notes immediately (not on the transport), so it
// stays clear of the cross-embed playback coordination entirely.
const PREVIEW_VOICE = 'editor-preview';
// A short ascending motif that lets the ear catch the timbre's attack and decay.
const PREVIEW_MOTIF = [60, 64, 67]; // midi
const PREVIEW_NOTE_DURATION = 0.35; // seconds
const PREVIEW_NOTE_SPACING = 300; // ms between note onsets

export type AudioUnitProps = {
  unitSpec: AudioUnitSpec;
};

export function AudioUnit(props: AudioUnitProps) {
  const [spec, specActions] = useUmweltSpec();
  const [, audioActions] = useAudioEngine();
  const [isPreviewing, setIsPreviewing] = createSignal(false);

  // The timbre that would actually sound for this unit: an explicit instrument
  // wins; otherwise mirror playback's default (auto-by-layer, else `pure`).
  const effectiveInstrument = () => {
    if (props.unitSpec.instrument) return props.unitSpec.instrument;
    if (isLayered()) {
      const index = spec.audio.units.findIndex((u) => u.name === props.unitSpec.name);
      return instrumentForIndex(Math.max(0, index));
    }
    return 'pure' as const;
  };

  const previewInstrument = async () => {
    if (isPreviewing()) return;
    setIsPreviewing(true);
    await audioActions.startAudioContext();
    audioActions.ensureVoice(PREVIEW_VOICE, effectiveInstrument());
    PREVIEW_MOTIF.forEach((pitch, i) => {
      setTimeout(() => {
        audioActions.playNote({ duration: PREVIEW_NOTE_DURATION, pitch, volume: -6, pan: 0, time: 0, state: {} }, PREVIEW_VOICE);
      }, i * PREVIEW_NOTE_SPACING);
    });
    setTimeout(
      () => setIsPreviewing(false),
      (PREVIEW_MOTIF.length - 1) * PREVIEW_NOTE_SPACING + PREVIEW_NOTE_DURATION * 1000
    );
  };

  const getEncodings = () => {
    return Object.entries(props.unitSpec.encoding).sort((a, b) => {
      if (isAudioProp(a[0]) && isAudioProp(b[0])) {
        const aIndex = audioPropNames.indexOf(a[0]);
        const bIndex = audioPropNames.indexOf(b[0]);
        return aIndex - bIndex;
      }
      return 0;
    });
  };

  // What "default" resolves to, so the empty option reads truthfully: an
  // unset instrument becomes an auto-assigned distinct timbre per layer, else `pure`.
  const isLayered = () => spec.audio.units.length > 1 && spec.audio.composition === 'layer';
  const defaultInstrumentLabel = () => (isLayered() ? 'default (auto by layer)' : 'default (pure)');

  return (
    <EnumeratedItem>
      {spec.audio.units.length > 1 ? (
        <div>
          <h3 id={`unit-${props.unitSpec.name}`}>{props.unitSpec.name}</h3>
          <InputRow>
            <label>
              Unit name
              <input
                value={props.unitSpec.name}
                onChange={(e) => {
                  specActions.renameUnit(props.unitSpec.name, e.currentTarget.value);
                }}
              ></input>
            </label>
          </InputRow>
        </div>
      ) : null}
      <InputRow>
        <label>
          Instrument
          <EncodingRow>
            <select
              value={props.unitSpec.instrument ?? ''}
              onChange={(e) => {
                const v = e.currentTarget.value;
                specActions.changeInstrument(props.unitSpec.name, isInstrumentName(v) ? v : undefined);
              }}
            >
              <option value="" selected={!props.unitSpec.instrument}>
                {defaultInstrumentLabel()}
              </option>
              <For each={instrumentNames}>
                {(name) => (
                  <option value={name} selected={name === props.unitSpec.instrument}>
                    {name}
                  </option>
                )}
              </For>
            </select>
            <button type="button" onClick={previewInstrument} disabled={isPreviewing()} aria-label={`Preview ${effectiveInstrument()} instrument`}>
              {isPreviewing() ? 'Playing…' : 'Preview'}
            </button>
          </EncodingRow>
        </label>
      </InputRow>
      <div>
        <h4>Encodings</h4>
        <div>
          <Show when={getEncodings().length} fallback={'No encodings'}>
            <For each={getEncodings()}>
              {([propName, encoding]) => {
                if (encoding && isAudioProp(propName)) {
                  return <EncodingDefinition property={propName} encoding={encoding} unit={props.unitSpec.name} />;
                }
                return null;
              }}
            </For>
          </Show>
        </div>
      </div>
      <div>
        <h4>Traversals</h4>
        <div>
          <Show when={props.unitSpec.traversal.length} fallback={'No traversals'}>
            <ReorderableList
              items={props.unitSpec.traversal}
              renderItem={(traversal) => <TraversalDefinition unit={props.unitSpec.name} traversal={traversal} />}
              onReorder={(value, newIndex) => {
                specActions.reorderTraversal(props.unitSpec.name, value.field, newIndex);
              }}
            />
          </Show>
        </div>
      </div>
      {spec.audio.units.length > 1 ? <button onClick={() => specActions.removeAudioUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </EnumeratedItem>
  );
}
