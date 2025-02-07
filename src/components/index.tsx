import type { Component } from 'solid-js';

import { UmweltViewer } from '../components/viewer';
import { UmweltEditor } from '../components/editor';
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
