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

export function TraversalFieldControl(props: TraversalFieldControlProps) {
  const [spec] = useUmweltSpec();
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const fieldDef = getFieldDef(spec, props.traversalFieldDef.field);

  if (!fieldDef) {
    return null;
  }

  const selectedIdx = () => audioUnitStateActions.getTraversalIndex(props.traversalFieldDef.field);
  const setSelectedIdx = (idx: number) => audioUnitStateActions.setTraversalIndex(props.traversalFieldDef.field, idx);
  const domain = audioUnitStateActions.getFieldDomains()[props.traversalFieldDef.field];
  const selectedValue = () => domain[selectedIdx()];

  return (
    <div>
      <label>
        <span>{describeField(fieldDef, props.traversalFieldDef)}</span>
        <Switch>
          <Match when={fieldDef.type === 'nominal'}>
            <select onChange={(e) => setSelectedIdx(e.target.selectedIndex)} onMouseDown={() => audioEngineActions.stopTransport()} value={String(selectedValue())}>
              <For each={domain}>{(val) => <option value={String(val)}>{String(val)}</option>}</For>
            </select>
          </Match>
          <Match when={fieldDef.type !== 'nominal'}>
            <input aria-live="assertive" aria-valuetext={fmtValue(selectedValue(), props.traversalFieldDef)} onChange={(e) => setSelectedIdx(e.target.valueAsNumber)} onMouseDown={() => audioEngineActions.stopTransport()} type="range" min="0" max={domain.length - 1} value={selectedIdx()}></input>
            {fmtValue(selectedValue(), props.traversalFieldDef)}
          </Match>
        </Switch>
      </label>
    </div>
  );
}
