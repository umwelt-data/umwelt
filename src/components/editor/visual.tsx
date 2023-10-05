import { Accessor } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnit } from './visualUnit';
import { viewCompositions } from '../../types';

export type VisualProps = {
  currentTab: Accessor<string>;
};

export function Visual(props: VisualProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-visual" aria-labelledby="tab-visual" hidden={props.currentTab() !== 'visual'}>
      <h2>Visual</h2>
      {spec.visual.units.map((unit) => {
        return <VisualUnit unitSpec={unit} />;
      })}
      <div>
        <button onClick={() => specActions.addVisualUnit()}>Add visual unit</button>
      </div>
      {spec.visual.units.length > 1 ? (
        <div>
          <label>
            Composition
            <select value={spec.visual.composition}>
              {viewCompositions.map((composition) => {
                return <option value={composition}>{composition}</option>;
              })}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
