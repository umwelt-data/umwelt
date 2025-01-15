import { For, Match, Switch } from 'solid-js';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioTraversalFieldDef, UmweltPredicate } from '../../../types';
import { describeField, fmtValue } from '../../../util/description';
import { getFieldDef } from '../../../util/spec';
import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';

export type TraversalFieldControlProps = {
  traversalFieldDef: AudioTraversalFieldDef;
  selection?: UmweltPredicate;
};

export function TraversalFieldControl({ traversalFieldDef, selection }: TraversalFieldControlProps) {
  const [spec] = useUmweltSpec();
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const fieldDef = getFieldDef(spec, traversalFieldDef.field);

  if (!fieldDef) {
    return null;
  }

  const selectedIdx = () => audioUnitStateActions.getTraversalIndex(traversalFieldDef.field);
  const setSelectedIdx = (idx: number) => audioUnitStateActions.setTraversalIndex(traversalFieldDef.field, idx);
  const domain = audioUnitStateActions.getFieldDomains()[traversalFieldDef.field];
  const selectedValue = () => domain[selectedIdx()];

  return (
    <div>
      <label>
        <span>{describeField(fieldDef, traversalFieldDef)}</span>
        <Switch>
          <Match when={fieldDef.type === 'nominal'}>
            <select onChange={(e) => setSelectedIdx(e.target.selectedIndex)} onMouseDown={() => audioEngineActions.stopTransport()} value={String(selectedValue())}>
              <For each={domain}>{(val) => <option value={String(val)}>{String(val)}</option>}</For>
            </select>
          </Match>
          <Match when={fieldDef.type !== 'nominal'}>
            <input aria-live="assertive" aria-valuetext={fmtValue(selectedValue(), traversalFieldDef)} onChange={(e) => setSelectedIdx(e.target.valueAsNumber)} onMouseDown={() => audioEngineActions.stopTransport()} type="range" min="0" max={domain.length - 1} value={selectedIdx()}></input>
            {fmtValue(selectedValue(), traversalFieldDef)}
          </Match>
        </Switch>
      </label>
    </div>
  );
}
