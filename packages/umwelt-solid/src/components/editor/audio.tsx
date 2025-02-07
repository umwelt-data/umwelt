import { styled } from 'solid-styled-components';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { viewCompositions } from '../../types';
import { InputRow } from '../ui/styled';
import { AudioUnit } from './audioUnit';
import { Show } from 'solid-js';

const RowMargin = styled.div`
  margin-top: 1em;
`;

export function Audio() {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-audio" aria-labelledby="tab-audio">
      <h2>Audio</h2>
      {spec.audio.units.map((unit) => {
        return <AudioUnit unitSpec={unit} />;
      })}
      <RowMargin>
        <button onClick={() => specActions.addAudioUnit()}>Add audio unit</button>
      </RowMargin>
      <Show when={spec.audio.units.length > 1}>
        <RowMargin>
          <InputRow>
            <label>
              Composition
              <select value={spec.audio.composition}>
                {viewCompositions.map((composition) => {
                  return <option value={composition}>{composition}</option>;
                })}
              </select>
            </label>
          </InputRow>
        </RowMargin>
      </Show>
    </div>
  );
}
