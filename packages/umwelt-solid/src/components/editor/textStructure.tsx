import { Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import type { TextTarget } from '../../contexts/UmweltSpecContext';
import { TextNode } from '../../types';
import { TextNodeEditor } from './textNode';
import ReorderableList from '../ui/ReorderableList';
import { InputRow } from '../ui/styled';

// Renders one editable structure (a forest of TextNodes) for a given target — a
// visual view's chart description or the freeform additional structure.
export function TextStructureEditor(props: { target: TextTarget; structure: TextNode[] }) {
  const [, specActions] = useUmweltSpec();
  return (
    <div>
      <Show when={props.structure.length} fallback={<p>Nothing here yet — add a group or highlight to begin.</p>}>
        <ReorderableList
          items={props.structure}
          renderItem={(node) => <TextNodeEditor target={props.target} node={node} />}
          onReorder={(node, newIndex) => specActions.reorderTextNode(props.target, undefined, node.id, newIndex)}
        />
      </Show>
      <InputRow>
        <button onClick={() => specActions.addTextNode(props.target, undefined, 'group')}>Add group</button>
        <button onClick={() => specActions.addTextNode(props.target, undefined, 'predicate')}>Add highlight</button>
      </InputRow>
    </div>
  );
}
