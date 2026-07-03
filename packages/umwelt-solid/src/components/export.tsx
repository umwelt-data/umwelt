import { createSignal } from 'solid-js';
import { styled } from 'solid-styled-components';
import { shareSpecURL, prettyPrintSpec, exportableSpec } from '../util/spec';
import { UmweltSpec, isExportableUmweltValuesDataSource } from '../types';
import { useUmweltDatastore } from '../contexts/UmweltDatastoreContext';

const ExportUrlInput = styled('input')`
  width: 100%;
`;
const ExportSpecTextarea = styled('textarea')`
  width: 100%;
`;

// beyond this, links get truncated by some chat apps and servers
const URL_LENGTH_WARNING = 8000;

export interface ExportSpecProps {
  spec: UmweltSpec;
}

export const ExportSpec = (props: ExportSpecProps) => {
  const [datastore] = useUmweltDatastore();
  const [copied, setCopied] = createSignal(false);

  const exported = () => exportableSpec(props.spec, datastore());
  const shareUrl = () => shareSpecURL(props.spec, datastore());
  const embedsValues = () => isExportableUmweltValuesDataSource(exported().data);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <details>
      <summary>Export</summary>
      <label>
        Shareable Editor URL
        <ExportUrlInput readonly type="url" value={shareUrl()} />
      </label>
      <button onClick={copyUrl}>{copied() ? 'Copied!' : 'Copy URL'}</button>
      {embedsValues() && <p>This link embeds the full dataset, since the data was uploaded from a file.</p>}
      {shareUrl().length > URL_LENGTH_WARNING && <p role="alert">This link is very long and may not survive being pasted into some apps. Consider hosting the data at a URL and loading it from there instead.</p>}
      {/** TODO add an embeddable URL of just the viewer */}
      <label>
        Spec
        <ExportSpecTextarea readonly rows={30}>
          {prettyPrintSpec(exported())}
        </ExportSpecTextarea>
      </label>
    </details>
  );
};
