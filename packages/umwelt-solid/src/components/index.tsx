import type { Component } from 'solid-js';
import styles from '../App.module.scss';

import { UmweltViewer } from './viewer';
import { UmweltEditor } from './editor';
import { useUmweltSpec } from '../contexts/UmweltSpecContext';

export const Umwelt: Component = () => {
  const [spec, _] = useUmweltSpec();

  return (
    <>
      <div class={styles.column}>
        <h1>Editor</h1>
        <UmweltEditor />
      </div>
      <div class={styles.column}>
        <h1>Viewer</h1>
        <UmweltViewer spec={spec} />
      </div>
    </>
  );
};
