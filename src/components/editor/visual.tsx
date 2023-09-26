import { Accessor } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';

export type VisualProps = {
  currentTab: Accessor<string>;
};

export function Visual(props: VisualProps) {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div role="tabpanel" id="tabpanel-visual" aria-labelledby="tab-visual" hidden={props.currentTab() !== 'visual'}>
      <h2>Visual</h2>
      <pre>
        <code>{JSON.stringify(spec, null, 2)}</code>
      </pre>
    </div>
  );
}
