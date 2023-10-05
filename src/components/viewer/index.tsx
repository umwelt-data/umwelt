import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { printableSpec } from '../../util/debug';

import styles from '../../App.module.css';
import { Visualization } from './visualization';

export function Viewer() {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div class={styles.Viewer}>
      <h1>Viewer</h1>

      <Visualization />

      <pre>
        <code>{printableSpec(spec)}</code>
      </pre>
    </div>
  );
}
