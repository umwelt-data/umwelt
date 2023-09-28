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
      <h4>
        <input
          value={props.unitSpec.name}
          onChange={(e) => {
            const { selectionStart, selectionEnd, selectionDirection } = e.currentTarget;
            e.currentTarget.value = specActions.renameUnit(props.unitSpec.name, e.currentTarget.value);
            e.currentTarget.setSelectionRange(selectionStart, selectionEnd, selectionDirection || 'none');
          }}
        ></input>
      </h4>
      <pre>
        <code>{JSON.stringify(props.unitSpec, null, 2)}</code>
      </pre>
      {spec.visual.units.length > 1 ? <button onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
