import { createEffect } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { Data } from './data';
import { Fields } from './fields';
import { Visual } from './visual';
import { Audio } from './audio';

import styles from '../../App.module.scss';
import { Dynamic } from 'solid-js/web';
import { createStoredSignal } from '../../util/solid';

type EditorTab = 'data' | 'fields' | 'visual' | 'audio';

export function UmweltEditor() {
  const [spec, _] = useUmweltSpec();
  const [currentTab, setCurrentTab] = createStoredSignal<EditorTab>('umweltTab', spec.data.values.length && spec.fields.length ? 'fields' : 'data');

  createEffect(() => {
    if (!(spec.data.values.length && spec.fields.length)) {
      setCurrentTab('data');
    }
  });

  const tabs = {
    data: Data,
    fields: Fields,
    visual: Visual,
    audio: Audio,
  };

  return (
    <div class={styles.Editor}>
      <h1 id="header-editor">Editor</h1>
      <div class="uw-editor" role="region" aria-labelledby="header-editor">
        <div role="tablist">
          <button role="tab" id="tab-data" aria-controls="tabpanel-data" aria-selected={currentTab() === 'data'} onClick={() => setCurrentTab('data')}>
            Data
          </button>
          <button role="tab" id="tab-fields" aria-controls="tabpanel-fields" aria-selected={currentTab() === 'fields'} onClick={() => setCurrentTab('fields')} disabled={!(spec.data.values.length && spec.fields.length)}>
            Fields
          </button>
          <button role="tab" id="tab-visual" aria-controls="tabpanel-visual" aria-selected={currentTab() === 'visual'} onClick={() => setCurrentTab('visual')} disabled={!(spec.data.values.length && spec.fields.length)}>
            Visual
          </button>
          <button role="tab" id="tab-audio" aria-controls="tabpanel-audio" aria-selected={currentTab() === 'audio'} onClick={() => setCurrentTab('audio')} disabled={!(spec.data.values.length && spec.fields.length)}>
            Audio
          </button>
        </div>

        <Dynamic component={tabs[currentTab()]} />
      </div>
    </div>
  );
}
