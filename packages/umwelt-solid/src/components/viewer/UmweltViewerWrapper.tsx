import { createEffect, createSignal } from 'solid-js';
import { UmweltViewer } from './index';
import { UmweltDatastoreProvider, useUmweltDatastore } from '../../contexts/UmweltDatastoreContext';
import { ExportableSpec, UmweltSpec } from '../../types';
import { validateSpecAsync, elaborateExportableSpec } from '../../util/spec';

interface UmweltViewerWrapperProps {
  exportableSpec: ExportableSpec;
}

function UmweltViewerWithDatastore(props: UmweltViewerWrapperProps) {
  const [datastore, datastoreActions] = useUmweltDatastore();
  const [spec, setSpec] = createSignal<UmweltSpec>();
  const [loading, setLoading] = createSignal<boolean>(true);

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
    try {
      // Try to validate and load the spec asynchronously (handles URL loading)
      const validatedSpec = await validateSpecAsync(currentExportableSpec, datastore(), datastoreActions.setDataset);
      if (validatedSpec) {
        setSpec(validatedSpec);
      } else {
        // Fallback to basic elaboration if validation fails
        console.warn('Failed to validate spec, falling back to basic elaboration');
        const elaboratedSpec = elaborateExportableSpec(currentExportableSpec);
        setSpec(elaboratedSpec);
      }
    } catch (error) {
      console.error('Error loading spec:', error);
      // Fallback to basic elaboration
      const elaboratedSpec = elaborateExportableSpec(currentExportableSpec);
      setSpec(elaboratedSpec);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div>
      {loading() && <div>Loading...</div>}
      {!loading() && spec() && <UmweltViewer spec={spec()!} data={data()} />}
    </div>
  );
}

/**
 * Wrapper component that handles ExportableSpec and provides the necessary datastore context.
 * This component loads data from URLs if needed and manages the datastore.
 */
export function UmweltViewerWrapper(props: UmweltViewerWrapperProps) {
  return (
    <UmweltDatastoreProvider>
      <UmweltViewerWithDatastore exportableSpec={props.exportableSpec} />
    </UmweltDatastoreProvider>
  );
}