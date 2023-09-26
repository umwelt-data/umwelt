import { Accessor } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDefinition } from './fieldDefinition';

export type FieldsProps = {
  currentTab: Accessor<string>;
};

export function Fields(props: FieldsProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-fields" aria-labelledby="tab-fields" hidden={props.currentTab() !== 'fields'}>
      <h2>Fields</h2>
      <div>
        <h3>Select fields</h3>
        {spec.fields.map((field) => {
          return (
            <div>
              <label>
                {field.name}
                <input
                  type="checkbox"
                  checked={field.active}
                  onChange={(e) => {
                    specActions.setFieldActive(field.name, e.currentTarget.checked);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
      <div>
        <h3>Key</h3>
        {spec.key.length ? (
          <ol>
            {spec.key.map((key, idx) => {
              return (
                <li>
                  <label>
                    {key}
                    {idx === 0 ? null : <button onClick={() => specActions.reorderKeyField(key, idx - 1)}>Move up</button>}
                    {idx === spec.key.length - 1 ? null : <button onClick={() => specActions.reorderKeyField(key, idx + 1)}>Move down</button>}
                  </label>
                </li>
              );
            })}
          </ol>
        ) : (
          <div>None</div>
        )}
      </div>
      <div>
        <h3>Field Definitions</h3>
        {spec.fields.map((field) => {
          if (field.active) {
            return <FieldDefinition field={field} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
