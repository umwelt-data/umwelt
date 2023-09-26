import { Accessor } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';

export type AudioProps = {
  currentTab: Accessor<string>;
};

export function Audio(props: AudioProps) {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-audio" aria-labelledby="tab-audio" hidden={props.currentTab() !== 'audio'}>
      <h2>Audio</h2>
      <pre>
        <code>{JSON.stringify(spec, null, 2)}</code>
      </pre>
    </div>
  );
}
