import { useUmweltSpec } from '../../contexts/UmweltSpecContext';

import styles from '../../App.module.css';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { exportableSpec, prettyPrintSpec } from '../../util/spec';

export function Viewer() {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div class={styles.Viewer}>
      <h1>Viewer</h1>

      <Visualization />
      <TextualStructure />

      <pre>
        <code>{prettyPrintSpec(exportableSpec(spec))}</code>
      </pre>
    </div>
  );
}
