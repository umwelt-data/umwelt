import { createEffect, For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { DEFAULT_DATASET_NAME, getData } from '../../util/datasets';
import { UmweltDataset } from '../../types';
import { UploadData } from './dataUpload';
import { LoadDataFromURL } from './dataURL';
import { fmtValue } from '../../util/description';
import { getFieldDef, resolveFieldDef } from '../../util/spec';
import { UmweltDatastore, useUmweltDatastore } from '../../contexts/UmweltDatastoreContext';
import { createStoredSignal } from '../../util/solid';
import { styled } from 'solid-styled-components';
import { MONOSPACE, StyledTable, LabelButtonRow } from '../ui/styled';

const vegaDatasets = ['stocks.csv', 'cars.json', 'weather.csv', 'seattle-weather.csv', 'penguins.json', 'driving.json', 'barley.json', 'disasters.csv', 'gapminder.json'];
export const VEGA_DATA_URL_PREFIX = 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/';

const vegaDataUrl = (filename: string) => `${VEGA_DATA_URL_PREFIX}${filename}`;

export function Data() {
  const [spec, specActions] = useUmweltSpec();
  const [datastore, datastoreActions] = useUmweltDatastore();
  const data = () => datastore()[spec.data.name]?.data || [];

  const [recentFiles, setRecentFiles] = createStoredSignal<string[]>('umweltRecentFiles', []);
  const [vegaDatasetsCache, setVegaDatasetsCache] = createStoredSignal<UmweltDatastore>('vegaDatasetsCache', {});

  // if spec.data is not set, initialize with most recently uploaded file or example dataset
  createEffect(() => {
    if (!spec.data.name || spec.data.name === DEFAULT_DATASET_NAME) {
      const recent = recentFiles();
      if (recent.length && datastore()[recent[0]]) {
        specActions.initializeData(recent[0]);
      } else {
        loadDataFromVegaDatasets(vegaDatasets[0]);
      }
    }
  });

  const loadDataFromUpload = (filename: string, data: UmweltDataset) => {
    datastoreActions.setDataset(filename, data);
    setRecentFiles([filename, ...recentFiles().filter((f) => f !== filename)]);
    specActions.initializeData(filename);
  };

  const loadDataFromURL = (url: string, data: UmweltDataset) => {
    const filename = url.split('/').pop() || url;
    datastoreActions.setDataset(filename, data, url);
    setRecentFiles([filename, ...recentFiles().filter((f) => f !== filename)]);
    specActions.initializeData(filename);
  };

  const loadDataFromRecentFile = (filename: string) => {
    if (datastore()[filename]) {
      specActions.initializeData(filename);
    }
  };

  const loadDataFromVegaDatasets = (filename: string) => {
    const cache = vegaDatasetsCache();
    if (cache[filename]) {
      datastoreActions.setDataset(filename, cache[filename].data, filename);
      specActions.initializeData(filename);
      return;
    }
    getData(vegaDataUrl(filename)).then((data) => {
      if (data && data.length) {
        setVegaDatasetsCache({ ...cache, [filename]: { data, sourceUrl: filename } });
        datastoreActions.setDataset(filename, data, filename);
        specActions.initializeData(filename);
      }
    });
  };

  const DataTable = () => {
    return (
      <Show when={spec.data && spec.data.name && data().length} fallback={'No dataset loaded'}>
        <StyledTable>
          <thead>
            <tr>
              <For each={Object.keys(data()[0])}>{(key) => <th>{key}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={data()}>
              {(row) => (
                <tr>
                  <For each={Object.entries(row)}>
                    {([fieldName, value]) => {
                      const fieldDef = getFieldDef(spec, fieldName);
                      if (!fieldDef) {
                        return <td>{String(value)}</td>;
                      }
                      const resolvedDef = resolveFieldDef(fieldDef);
                      return <td>{fmtValue(value, resolvedDef)}</td>;
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </StyledTable>
      </Show>
    );
  };

  return (
    <div role="tabpanel" id="tabpanel-data" aria-labelledby="tab-data">
      <h2>Data</h2>
      <DataTable />
      <h3>Upload JSON or CSV file</h3>
      <UploadData loadDataFromUpload={loadDataFromUpload} />
      <h3>Load data from URL</h3>
      <LoadDataFromURL loadDataFromURL={loadDataFromURL} />
      <h3>Recently uploaded files</h3>
      <Show when={recentFiles().length > 0} fallback={'No files uploaded.'}>
        <For each={recentFiles()}>
          {(filename) => (
            <LabelButtonRow>
              <label>
                <input type="radio" name="recent_files" checked={filename === spec.data.name} onChange={(e) => loadDataFromRecentFile(e.target.value)} value={filename} />
                {filename}
              </label>
              <button onClick={() => setRecentFiles(recentFiles().filter((f) => f !== filename))}>Remove {filename}</button>
            </LabelButtonRow>
          )}
        </For>
      </Show>
      <h3>Example datasets</h3>
      <For each={vegaDatasets.filter((name) => !recentFiles().find((n) => n === name))}>
        {(filename) => {
          return (
            <div>
              <label>
                <input type="radio" name="example_datasets" checked={filename === spec.data.name} onChange={(e) => loadDataFromVegaDatasets(e.target.value)} value={filename} />
                {filename}
              </label>
            </div>
          );
        }}
      </For>
    </div>
  );
}
