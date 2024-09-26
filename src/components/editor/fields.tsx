import { Accessor, For, Index, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDefinition } from './fieldDefinition';

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
          <ol>
            <Index each={spec.key}>
              {(key, idx) => (
                <li>
                  <label>
                    {key()}
                    {idx === 0 ? null : <button onClick={() => specActions.reorderKeyField(key(), idx - 1)}>Move up</button>}
                    {idx === spec.key.length - 1 ? null : <button onClick={() => specActions.reorderKeyField(key(), idx + 1)}>Move down</button>}
                  </label>
                </li>
              )}
            </Index>
          </ol>
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
