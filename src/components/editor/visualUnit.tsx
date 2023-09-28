import { createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec } from '../../types';

export type VisualUnitProps = {
  unitSpec: VisualUnitSpec;
};

export function VisualUnit(props: VisualUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h4 id={`unit-${props.unitSpec.name}`}>{props.unitSpec.name}</h4>
      <input
        aria-labelledby={`unit-${props.unitSpec.name}`}
        value={props.unitSpec.name}
        onChange={(e) => {
          specActions.renameUnit(props.unitSpec.name, e.currentTarget.value);
        }}
      ></input>
      <pre>
        <code>{JSON.stringify(props.unitSpec, null, 2)}</code>
      </pre>
      {spec.visual.units.length > 1 ? <button onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
