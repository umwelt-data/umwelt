import type { Component } from 'solid-js';

import styles from './App.module.css';
import { UmweltSpecProvider } from './contexts/UmweltSpecContext';
import { UmweltDatastoreProvider } from './contexts/UmweltDatastoreContext';
import { Umwelt } from './components';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <UmweltDatastoreProvider>
        <UmweltSpecProvider>
          <Umwelt />
        </UmweltSpecProvider>
      </UmweltDatastoreProvider>
    </div>
  );
};

export default App;
