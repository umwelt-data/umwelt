import { createMemo, For, Match, Switch } from 'solid-js';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioTraversalFieldDef, UmweltPredicate } from '../../../types';
import { describeField, fmtValue } from '../../../util/description';
import { getFieldDef, resolveFieldDef } from '../../../util/spec';
import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { derivedFieldNameBinStartEnd } from '../../../util/transforms';

export type TraversalFieldControlProps = {
  traversalFieldDef: AudioTraversalFieldDef;
  selection?: UmweltPredicate;
};

export function TraversalFieldControl(props: TraversalFieldControlProps) {
  const [spec] = useUmweltSpec();
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const fieldDef = () => getFieldDef(spec, props.traversalFieldDef.field);

  const resolvedFieldDef = () => resolveFieldDef(fieldDef()!, props.traversalFieldDef);

  const selectedIdx = () => audioUnitStateActions.getTraversalIndex(props.traversalFieldDef.field);
  const setSelectedIdx = (idx: number) => {
    audioEngineActions.startAudioContext();
    audioUnitStateActions.setTraversalIndex(props.traversalFieldDef.field, idx);
  };
  const domain = () => audioUnitStateActions.getFieldDomains()[props.traversalFieldDef.field];
  const selectedValue = () => audioUnitStateActions.getDomainValue(props.traversalFieldDef.field, selectedIdx());

  return (
    <div>
      <label>
        <span>{describeField(resolvedFieldDef())}</span>
        <Switch>
          <Match when={resolvedFieldDef().type === 'nominal'}>
            <select onChange={(e) => setSelectedIdx(e.target.selectedIndex)} onMouseDown={() => audioEngineActions.stopTransport()} value={String(selectedValue())}>
              <For each={domain()}>{(val) => <option value={String(val)}>{String(val)}</option>}</For>
            </select>
          </Match>
          <Match when={resolvedFieldDef().type !== 'nominal'}>
            <input aria-live="assertive" aria-valuetext={fmtValue(selectedValue(), resolvedFieldDef())} onChange={(e) => setSelectedIdx(e.target.valueAsNumber)} onMouseDown={() => audioEngineActions.stopTransport()} type="range" min="0" max={domain().length - 1} value={selectedIdx()}></input>
            {fmtValue(selectedValue(), resolvedFieldDef())}
          </Match>
        </Switch>
      </label>
    </div>
  );
}
