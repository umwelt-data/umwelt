import { For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import type { TextTarget } from '../../contexts/UmweltSpecContext';
import { TextNode, TextFieldRef, TextGroupNode, TextPredicateNode, isTextGroupNode } from '../../types';
import { TextPredicateEditor } from './textPredicate';
import { FieldTransforms } from './fieldTransforms';
import ReorderableList from '../ui/ReorderableList';
import { EncodingColumn, EncodingRow, EnumeratedItem } from '../ui/styled';

export type TextNodeEditorProps = {
  target: TextTarget;
  node: TextNode;
};

// One field within a group node's (possibly crossed) groupby list. Type / bin /
// time-unit overrides live in the shared "Additional options" (FieldTransforms).
function GroupFieldRow(props: { target: TextTarget; nodeId: string; index: number; fieldRef: TextFieldRef; canRemove: boolean }) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <EncodingColumn>
      <EncodingRow>
        <select value={props.fieldRef.field} onChange={(e) => specActions.setTextNodeField(props.target, props.nodeId, props.index, e.currentTarget.value)}>
          <option value="">(choose field)</option>
          <For each={spec.fields.filter((f) => f.active)}>{(field) => <option value={field.name}>{field.name}</option>}</For>
        </select>
        <Show when={props.canRemove}>
          <button onClick={() => specActions.removeTextNodeGroupField(props.target, props.nodeId, props.index)}>Remove field</button>
        </Show>
      </EncodingRow>
      <Show when={props.fieldRef.field}>
        <FieldTransforms fieldName={props.fieldRef.field} textNode={{ target: props.target, nodeId: props.nodeId, index: props.index, ref: props.fieldRef }} />
      </Show>
    </EncodingColumn>
  );
}

// One node in a text unit's structure tree — a grouping or a named data
// highlight — plus its nested children.
export function TextNodeEditor(props: TextNodeEditorProps) {
  const [, specActions] = useUmweltSpec();

  // Header mirrors how the node reads in the output: "Group by <field(s)>" or a
  // named "Data highlight", so the editor and the described tree use one vocabulary.
  const heading = () => {
    if (isTextGroupNode(props.node)) {
      const names = props.node.groupby.map((g) => g.field).filter(Boolean);
      return names.length ? `Group by ${names.join(' and ')}` : 'Group by a field';
    }
    return props.node.name ? `Data highlight: ${props.node.name}` : 'Data highlight';
  };

  return (
    <EnumeratedItem>
      <EncodingRow>
        <strong>{heading()}</strong>
        <button onClick={() => specActions.removeTextNode(props.target, props.node.id)} aria-label="Remove node">
          Remove
        </button>
      </EncodingRow>

      <Show when={isTextGroupNode(props.node) ? (props.node as TextGroupNode) : undefined}>
        {(groupNode) => (
          <div>
            <For each={groupNode().groupby}>{(gref, i) => <GroupFieldRow target={props.target} nodeId={groupNode().id} index={i()} fieldRef={gref} canRemove={groupNode().groupby.length > 1} />}</For>
            <button onClick={() => specActions.addTextNodeGroupField(props.target, groupNode().id)}>Add field to groupby</button>
          </div>
        )}
      </Show>

      <Show when={!isTextGroupNode(props.node) ? (props.node as TextPredicateNode) : undefined}>{(predNode) => <TextPredicateEditor target={props.target} node={predNode()} />}</Show>

      {/* nested children */}
      <div style={{ 'margin-left': '1rem' }}>
        <Show when={props.node.children.length}>
          <ReorderableList
            items={props.node.children}
            renderItem={(child) => <TextNodeEditor target={props.target} node={child} />}
            onReorder={(child, newIndex) => specActions.reorderTextNode(props.target, props.node.id, child.id, newIndex)}
          />
        </Show>
        <button onClick={() => specActions.addTextNode(props.target, props.node.id, 'group')}>Add child group</button>
        <button onClick={() => specActions.addTextNode(props.target, props.node.id, 'predicate')}>Add child highlight</button>
      </div>
    </EnumeratedItem>
  );
}
