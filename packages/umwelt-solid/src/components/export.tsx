import { styled } from 'solid-styled-components';
import { shareSpecURL, prettyPrintSpec, exportableSpec } from '../util/spec';
import { UmweltSpec } from '../types';
import { useUmweltDatastore } from '../contexts/UmweltDatastoreContext';

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
  const [datastore] = useUmweltDatastore();
  
  return (
    <details>
      <summary>Export</summary>
      <label>
        Shareable Editor URL
        <ExportUrlInput readonly type="url" value={shareSpecURL(props.spec, datastore())} />
      </label>
      {/** TODO add an embeddable URL of just the viewer */}
      <label>
        Spec
        <ExportSpecTextarea readonly rows={30}>
          {prettyPrintSpec(exportableSpec(props.spec, datastore()))}
        </ExportSpecTextarea>
      </label>
    </details>
  );
};
