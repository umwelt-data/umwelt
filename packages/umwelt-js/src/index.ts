import { Component, JSX, createComponent } from 'solid-js';

export function component<P extends Record<string, any>>(fn: Component<P>) {
  return (props?: P) => createComponent(fn, props || ({} as P));
}

import { UmweltViewer as UmweltViewerSolid, UmweltViewerProps } from '../../umwelt-solid/src/components/viewer';
import { render as solidRender, MountableElement } from 'solid-js/web';
import h from 'solid-js/h';

export type ExpandableNode = Node & {
  [key: string]: any;
};
export type HyperScriptReturn = () => ExpandableNode | ExpandableNode[];
export type Child = JSX.Element | HyperScriptReturn;

export const UmweltViewer: {
  (props: UmweltViewerProps, children?: Child | Child[]): HyperScriptReturn;
  (children: Child | Child[]): HyperScriptReturn;
} = (...args: any[]) => {
  console.log('UmweltViewer', args);
  return h(UmweltViewerSolid, ...args);
};

export const render = (code: () => Child | Child[], element: MountableElement) => {
  console.log('rendering', code);
  return solidRender(() => code() as unknown as JSX.Element, element);
};
