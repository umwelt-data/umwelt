import type { Component } from 'solid-js';

import styles from './App.module.css';
import { Viewer } from './components/viewer';
import { Editor } from './components/editor';
import { UmweltSpecProvider } from './contexts/UmweltSpecContext';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <UmweltSpecProvider>
        <Editor />
        <Viewer />
      </UmweltSpecProvider>
    </div>
  );
};

export default App;
