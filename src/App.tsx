import type { Component } from 'solid-js';

import styles from './App.module.css';
import { Viewer } from './components/viewer';
import { Editor } from './components/editor';
import { UmweltSpecProvider } from './contexts/UmweltSpecContext';
import { UmweltDatastoreProvider } from './contexts/UmweltDatastoreContext';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <UmweltDatastoreProvider>
        <UmweltSpecProvider>
          <Editor />
          <Viewer />
        </UmweltSpecProvider>
      </UmweltDatastoreProvider>
    </div>
  );
};

export default App;
