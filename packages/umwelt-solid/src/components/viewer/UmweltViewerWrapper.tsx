import { createEffect, createSignal } from 'solid-js';
import { UmweltViewer } from './index';
import { UmweltDatastoreProvider, useUmweltDatastore } from '../../contexts/UmweltDatastoreContext';
import { ExportableSpec, UmweltSpec } from '../../types';
import { validateSpecAsync } from '../../util/spec';

interface UmweltViewerWrapperProps {
  exportableSpec: ExportableSpec;
}

function UmweltViewerWithDatastore(props: UmweltViewerWrapperProps) {
  const [datastore, datastoreActions] = useUmweltDatastore();
  const [spec, setSpec] = createSignal<UmweltSpec>();
  const [loading, setLoading] = createSignal<boolean>(true);
  const [error, setError] = createSignal<string>();

  const data = () => {
    const currentSpec = spec();
    if (!currentSpec) return [];
    const entry = datastore()[currentSpec.data.name];
    return entry?.data || [];
  };

  createEffect(async () => {
    // This effect will re-run whenever props.exportableSpec changes
    const currentExportableSpec = props.exportableSpec;
    setLoading(true);
    setError(undefined);
    try {
      // Validate and load the spec asynchronously (resolves url and example-name data sources)
      const validatedSpec = await validateSpecAsync(currentExportableSpec, datastore(), datastoreActions.setDataset);
      if (validatedSpec) {
        setSpec(validatedSpec);
      } else {
        setError('Failed to load Umwelt spec: the spec is invalid or its data source could not be resolved.');
      }
    } catch (err) {
      console.error('Error loading spec:', err);
      setError(`Failed to load Umwelt spec: ${err}`);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div>
      {loading() && <div>Loading...</div>}
      {!loading() && error() && <div role="alert">{error()}</div>}
      {!loading() && !error() && spec() && <UmweltViewer spec={spec()!} data={data()} />}
    </div>
  );
}

/**
 * Wrapper component that handles ExportableSpec and provides the necessary datastore context.
 * This component loads data from URLs if needed and manages the datastore.
 */
export function UmweltViewerWrapper(props: UmweltViewerWrapperProps) {
  return (
    <UmweltDatastoreProvider persist={false}>
      <UmweltViewerWithDatastore exportableSpec={props.exportableSpec} />
    </UmweltDatastoreProvider>
  );
}