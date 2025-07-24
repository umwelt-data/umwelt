import type { Component } from 'solid-js';
import styles from '../App.module.scss';

import { UmweltViewer } from './viewer';
import { UmweltEditor } from './editor';
import { useUmweltSpec } from '../contexts/UmweltSpecContext';
import { useUmweltDatastore } from '../contexts/UmweltDatastoreContext';
import { ExportSpec } from './export';

export const Umwelt: Component = () => {
  const [spec, _] = useUmweltSpec();
  const [datastore] = useUmweltDatastore();
  const data = () => datastore()[spec.data.name]?.data || [];

  return (
    <>
      <div class={styles.column}>
        <h1>Editor</h1>
        <UmweltEditor />
        <ExportSpec spec={spec} />
      </div>
      <div class={styles.column}>
        <h1>Viewer</h1>
        <UmweltViewer spec={spec} data={data()} />
      </div>
    </>
  );
};
