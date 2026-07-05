import { For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec, DATA_STRUCTURE_KEY } from '../../types';
import { TextStructureEditor } from './textStructure';
import { seedChartOverride, seedDataStructure } from '../../util/spec';
import { EnumeratedItem, RowMargin } from '../ui/styled';

export function Text() {
  const [spec, specActions] = useUmweltSpec();

  const owned = (key: string) => spec.text.structures[key];
  // The structure shown for a view: its owned version, else the seed (a faithful
  // replica of what olli infers) as an editable starting point.
  const structureForView = (visUnit: VisualUnitSpec) => owned(visUnit.name) ?? seedChartOverride(visUnit, spec);
  const dataStructure = () => owned(DATA_STRUCTURE_KEY) ?? seedDataStructure(spec);

  return (
    <div role="tabpanel" id="tabpanel-text" aria-labelledby="tab-text">
      <h2>Text</h2>

      <Show
        when={spec.visual.units.length}
        fallback={
          <RowMargin>
            <TextStructureEditor target={DATA_STRUCTURE_KEY} structure={dataStructure()} />
            <Show when={owned(DATA_STRUCTURE_KEY)}>
              <button onClick={() => specActions.resetTextStructure(DATA_STRUCTURE_KEY)}>Reset to auto-generated</button>
            </Show>
          </RowMargin>
        }
      >
        <For each={spec.visual.units}>
          {(visUnit) => (
            <EnumeratedItem>
              <Show when={spec.visual.units.length > 1}>
                <h3>{visUnit.name}</h3>
              </Show>
              <TextStructureEditor target={visUnit.name} structure={structureForView(visUnit)} />
              <Show when={owned(visUnit.name)}>
                <button onClick={() => specActions.resetTextStructure(visUnit.name)}>Reset to auto-generated</button>
              </Show>
            </EnumeratedItem>
          )}
        </For>
      </Show>
    </div>
  );
}
