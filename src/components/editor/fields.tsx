import { Accessor, For, Index, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDefinition } from './fieldDefinition';
import ReorderableList from '../ui/ReorderableList';

export function Fields() {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-fields" aria-labelledby="tab-fields">
      <h2>Fields</h2>

      <h3>Select fields</h3>
      <For each={spec.fields}>
        {(field) => (
          <div>
            <label>
              <input
                type="checkbox"
                checked={field.active}
                onChange={(e) => {
                  specActions.setFieldActive(field.name, e.currentTarget.checked);
                }}
              />
              {field.name}
            </label>
          </div>
        )}
      </For>

      <h3>Key</h3>
      <div>
        <Show when={spec.key.length} fallback={'None'}>
          <ReorderableList items={spec.key} renderItem={(key: string) => <label>{key}</label>} onReorder={specActions.reorderKeyField} />
        </Show>
      </div>

      <div>
        <h3>Field Definitions</h3>
        <For each={spec.fields}>
          {(field) => (
            <Show when={field.active}>
              <FieldDefinition field={field} />
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}
