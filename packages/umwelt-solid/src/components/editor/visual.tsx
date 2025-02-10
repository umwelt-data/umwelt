import { Accessor, For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnit } from './visualUnit';
import { viewCompositions } from '../../types';
import { InputRow } from '../ui/styled';
import { styled } from 'solid-styled-components';

const RowMargin = styled.div`
  margin-top: 1em;
`;

export function Visual() {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-visual" aria-labelledby="tab-visual">
      <h2>Visual</h2>

      <For each={spec.visual.units}>{(unit) => <VisualUnit unitSpec={unit} />}</For>
      <RowMargin>
        <button onClick={() => specActions.addVisualUnit()}>Add visual unit</button>
      </RowMargin>
      <Show when={spec.visual.units.length > 1}>
        <RowMargin>
          <InputRow>
            <label>
              Composition
              <select value={spec.visual.composition} onChange={(e) => specActions.setComposition('visual', e.currentTarget.value)}>
                <For each={viewCompositions}>{(composition) => <option value={composition}>{composition}</option>}</For>
              </select>
            </label>
          </InputRow>
        </RowMargin>
      </Show>
    </div>
  );
}
