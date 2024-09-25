import { createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { Data } from './data';
import { Fields } from './fields';
import { Visual } from './visual';
import { Audio } from './audio';

import styles from '../../App.module.css';

type EditorTab = 'data' | 'fields' | 'visual' | 'audio';

export function Editor() {
  const [spec, _] = useUmweltSpec();
  const [currentTab, setCurrentTab] = createSignal<EditorTab>(spec.data && spec.fields.length ? 'fields' : 'data');

  const onFocus = (e: any) => {};

  return (
    <div class={styles.Editor}>
      <h1 id="header-editor">Editor</h1>
      <div class="uw-structured-editor" onFocus={(e) => onFocus(e)} role="region" aria-labelledby="header-editor"></div>

      <div role="tablist">
        <button role="tab" id="tab-data" aria-controls="tabpanel-data" aria-selected={currentTab() === 'data'} onClick={() => setCurrentTab('data')}>
          Data
        </button>
        <button role="tab" id="tab-fields" aria-controls="tabpanel-fields" aria-selected={currentTab() === 'fields'} onClick={() => setCurrentTab('fields')} disabled={!(spec.data && spec.fields.length)}>
          Fields
        </button>
        <button role="tab" id="tab-visual" aria-controls="tabpanel-visual" aria-selected={currentTab() === 'visual'} onClick={() => setCurrentTab('visual')} disabled={!(spec.data && spec.fields.length)}>
          Visual
        </button>
        <button role="tab" id="tab-audio" aria-controls="tabpanel-audio" aria-selected={currentTab() === 'audio'} onClick={() => setCurrentTab('audio')} disabled={!(spec.data && spec.fields.length)}>
          Audio
        </button>
      </div>

      <Data currentTab={currentTab} />
      <Fields currentTab={currentTab} />
      <Visual currentTab={currentTab} />
      <Audio currentTab={currentTab} />
    </div>
  );
}
