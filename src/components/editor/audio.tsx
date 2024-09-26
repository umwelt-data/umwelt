import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { viewCompositions } from '../../types';
import { AudioUnit } from './audioUnit';

export function Audio() {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-audio" aria-labelledby="tab-audio">
      <h2>Audio</h2>
      {spec.audio.units.map((unit) => {
        return <AudioUnit unitSpec={unit} />;
      })}
      <div>
        <button onClick={() => specActions.addAudioUnit()}>Add audio unit</button>
      </div>
      {spec.audio.units.length > 1 ? (
        <div>
          <label>
            Composition
            <select value={spec.audio.composition}>
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
