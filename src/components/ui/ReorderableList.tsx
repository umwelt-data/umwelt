import { Index } from 'solid-js';
import type { JSX } from 'solid-js';
import { styled } from 'solid-styled-components';

interface ReorderableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => JSX.Element;
  onReorder: (value: T, newIndex: number) => void;
}

const ItemContainer = styled('div')`
  display: flex;
  list-style-type: decimal;
`;

const RenderItem = styled('div')`
  flex: 0 1 auto;
`;

const ReorderControls = styled('div')`
  margin-left: 3px;
  flex: 0 0 auto;
`;

const ReorderableList = <T,>(props: ReorderableListProps<T>): JSX.Element => {
  const moveItem = (item: T, newIndex: number): void => {
    if (newIndex < 0 || newIndex >= props.items.length) return;
    props.onReorder(item, newIndex);
  };

  return (
    <ol>
      <Index each={props.items}>
        {(item, idx) => (
          <li>
            <ItemContainer>
              <RenderItem>{props.renderItem(item(), idx)}</RenderItem>
              <ReorderControls>
                {idx !== 0 && (
                  <button onClick={() => moveItem(item(), idx - 1)} aria-label="Move up">
                    ↑
                  </button>
                )}
                {idx !== props.items.length - 1 && (
                  <button onClick={() => moveItem(item(), idx + 1)} aria-label="Move down">
                    ↓
                  </button>
                )}
              </ReorderControls>
            </ItemContainer>
          </li>
        )}
      </Index>
    </ol>
  );
};

export default ReorderableList;
