import { For } from 'solid-js';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec, UmweltSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioUnitStateProvider, useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { AudioScalesProvider } from '../../../contexts/sonification/AudioScalesContext';
import { AudioUnitPlaybackControl } from './audioUnitPlaybackControl';
import { describeField } from '../../../util/description';
import { getFieldDef, resolveFieldDef } from '../../../util/spec';
import { EnumeratedItem, InputRow } from '../../ui/styled';
import { styled } from 'solid-styled-components';

export type AudioUnitProps = {
  spec: UmweltSpec;
  audioUnitSpec: AudioUnitSpec;
};

const EncodingsContainer = styled.div`
  margin-bottom: 1em;
`;

export function AudioUnit(props: AudioUnitProps) {
  function AudioUnitEncodings() {
    return (
      <EncodingsContainer>
        <For each={Object.entries(props.audioUnitSpec.encoding)}>
          {([propName, encoding]) => {
            if (encoding) {
              const fieldDef = getFieldDef(props.spec, encoding.field);
              if (fieldDef) {
                const resolvedFieldDef = resolveFieldDef(fieldDef, encoding);
                return (
                  <InputRow>
                    <label>
                      {propName} <input readonly value={describeField(resolvedFieldDef)} />
                    </label>
                  </InputRow>
                );
              }
            }
          }}
        </For>
      </EncodingsContainer>
    );
  }

  function AudioUnitDescription() {
    const [_, audioUnitStateActions] = useAudioUnitState();

    return (
      <p>
        {audioUnitStateActions.describeEncodings()}
        <br />
        playing {audioUnitStateActions.describePlaybackOrder()}
      </p>
    );
  }

  return (
    <EnumeratedItem>
      <AudioScalesProvider encoding={props.audioUnitSpec.encoding}>
        <AudioUnitStateProvider audioUnitSpec={props.audioUnitSpec}>
          <AudioUnitDescription />
          <AudioUnitEncodings />
          <For each={props.audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl spec={props.spec} traversalFieldDef={traversalFieldDef} />}</For>
          <AudioUnitPlaybackControl unitName={props.audioUnitSpec.name} />
        </AudioUnitStateProvider>
      </AudioScalesProvider>
    </EnumeratedItem>
  );
}
