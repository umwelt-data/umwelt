import { createSignal, For, Match, Switch } from 'solid-js';
import { useSonificationRuntime } from '../../../contexts/SonificationRuntimeContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioTraversalFieldDef, UmweltPredicate } from '../../../types';
import { describeField, fmtValue } from '../../../util/description';
import { getFieldDef } from '../../../util/spec';
import { getDomain } from '../../../util/domain';

export type TraversalFieldControlProps = {
  traversalFieldDef: AudioTraversalFieldDef;
  selection?: UmweltPredicate;
};

export function TraversalFieldControl({ traversalFieldDef, selection }: TraversalFieldControlProps) {
  const [spec, specActions] = useUmweltSpec();
  const [runtime, runtimeActions] = useSonificationRuntime();
  const [selectedIdx, setSelectedIdx] = createSignal<number>(0);

  const fieldDef = getFieldDef(spec, traversalFieldDef.field);

  if (!fieldDef) {
    return null;
  }

  const domain = getDomain(traversalFieldDef, spec.data.values, selection);

  return (
    <div>
      <label>
        <span>{describeField(fieldDef, traversalFieldDef)}</span>
        <Switch>
          <Match when={fieldDef.type === 'nominal'}>
            <select onChange={(e) => setSelectedIdx(e.target.selectedIndex)} value={String(domain[selectedIdx()])}>
              <For each={domain}>{(val) => <option value={String(val)}>{String(val)}</option>}</For>
            </select>
          </Match>
          <Match when={fieldDef.type !== 'nominal'}>
            <input aria-live="assertive" aria-valuetext={fmtValue(domain[selectedIdx()], traversalFieldDef)} onChange={(e) => setSelectedIdx(e.target.valueAsNumber)} type="range" min="0" max={domain.length - 1} value={selectedIdx()}></input>
            {fmtValue(domain[selectedIdx()], traversalFieldDef)}
          </Match>
        </Switch>
      </label>
    </div>
  );
}
