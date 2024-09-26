import { Accessor, For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnit } from './visualUnit';
import { viewCompositions } from '../../types';

export function Visual() {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-visual" aria-labelledby="tab-visual">
      <h2>Visual</h2>

      <For each={spec.visual.units}>{(unit) => <VisualUnit unitSpec={unit} />}</For>
      <div>
        <button onClick={() => specActions.addVisualUnit()}>Add visual unit</button>
      </div>
      <Show when={spec.visual.units.length > 1}>
        <div>
          <label>
            Composition
            <select value={spec.visual.composition}>
              <For each={viewCompositions}>{(composition) => <option value={composition}>{composition}</option>}</For>
            </select>
          </label>
        </div>
      </Show>
    </div>
  );
}
