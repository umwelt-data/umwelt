import { Mark } from 'vega-lite/src/mark';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec, isVisualProp, markTypes, visualPropNames } from '../../types';
import { EncodingDefinition } from './encodingDefinition';
import { For, Show } from 'solid-js';
import { EnumeratedItem, InputRow } from '../ui/styled';
import { styled } from 'solid-styled-components';

export type VisualUnitProps = {
  unitSpec: VisualUnitSpec;
};

const RemoveUnitButton = styled.button`
  margin-top: 1rem;
`;

export function VisualUnit(props: VisualUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  const getEncodings = () => {
    return Object.entries(props.unitSpec.encoding).sort((a, b) => {
      if (isVisualProp(a[0]) && isVisualProp(b[0])) {
        const aIndex = visualPropNames.indexOf(a[0]);
        const bIndex = visualPropNames.indexOf(b[0]);
        return aIndex - bIndex;
      }
      return 0;
    });
  };

  return (
    <EnumeratedItem>
      <Show when={spec.visual.units.length > 1}>
        <div>
          <h3 id={`unit-${props.unitSpec.name}`}>{props.unitSpec.name}</h3>
          <InputRow>
            <label>
              Unit name
              <input
                value={props.unitSpec.name}
                onChange={(e) => {
                  specActions.renameUnit(props.unitSpec.name, e.currentTarget.value);
                }}
              ></input>
            </label>
          </InputRow>
        </div>
      </Show>
      <InputRow>
        <label>
          Mark
          <select
            value={props.unitSpec.mark}
            onChange={(e) => {
              specActions.changeMark(props.unitSpec.name, e.currentTarget.value as Mark);
            }}
          >
            <For each={markTypes}>
              {(markType) => (
                <option value={markType} selected={markType === props.unitSpec.mark}>
                  {markType}
                </option>
              )}
            </For>
          </select>
        </label>
      </InputRow>
      <div>
        <h4>Encodings</h4>
        <div>
          <Show when={getEncodings().length} fallback={'No encodings'}>
            <For each={getEncodings()}>
              {([propName, encoding]) => {
                if (encoding && isVisualProp(propName)) {
                  return <EncodingDefinition property={propName} encoding={encoding} unit={props.unitSpec.name} />;
                }
                return null;
              }}
            </For>
          </Show>
        </div>
      </div>
      <Show when={spec.visual.units.length > 1}>
        <RemoveUnitButton onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</RemoveUnitButton>
      </Show>
    </EnumeratedItem>
  );
}
