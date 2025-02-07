import type { Component } from 'solid-js';

import { UmweltViewer } from './viewer';
import { UmweltEditor } from './editor';
import { useUmweltSpec } from '../contexts/UmweltSpecContext';

export const Umwelt: Component = () => {
  const [spec, _] = useUmweltSpec();

  return (
    <>
      <UmweltEditor />
      <UmweltViewer spec={spec} />
    </>
  );
};
