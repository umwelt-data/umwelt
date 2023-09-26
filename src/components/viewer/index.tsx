import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { printableSpec } from '../../util/debug';

import styles from '../../App.module.css';

export function Viewer() {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div class={styles.Viewer}>
      <h1>Viewer</h1>

      <pre>
        <code>{printableSpec(spec)}</code>
      </pre>
    </div>
  );
}
