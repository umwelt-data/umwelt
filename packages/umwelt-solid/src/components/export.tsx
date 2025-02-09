import { styled } from 'solid-styled-components';
import { shareSpecURL, prettyPrintSpec, exportableSpec } from '../util/spec';
import { UmweltSpec } from '../types';

const ExportUrlInput = styled('input')`
  width: 100%;
`;
const ExportSpecTextarea = styled('textarea')`
  width: 100%;
`;

export interface ExportSpecProps {
  spec: UmweltSpec;
}

export const ExportSpec = (props: ExportSpecProps) => {
  return (
    <details>
      <summary>Export</summary>
      <label>
        Shareable Editor URL
        <ExportUrlInput readonly type="url" value={shareSpecURL(props.spec)} />
      </label>
      {/** TODO add an embeddable URL of just the viewer */}
      <label>
        Spec
        <ExportSpecTextarea readonly rows={30}>
          {prettyPrintSpec(exportableSpec(props.spec))}
        </ExportSpecTextarea>
      </label>
    </details>
  );
};
