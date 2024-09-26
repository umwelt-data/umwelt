import { Accessor, createEffect, createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { getData } from '../../util/datasets';
import { UmweltDataset } from '../../types';
import { createStoredSignal } from '../../util/solid';
import { UploadData } from './dataUpload';
import { fmtValue } from '../../util/description';

export type DataProps = {
  currentTab: string;
};

interface DataFile {
  filename: string;
  data: UmweltDataset;
}

const vegaDatasets = ['stocks.csv', 'cars.json', 'weather.csv', 'seattle-weather.csv', 'penguins.json', 'driving.json', 'barley.json', 'disasters.csv', 'gapminder.json'];
const VEGA_DATA_URL_PREFIX = 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/';

const vegaDataUrl = (filename: string) => `${VEGA_DATA_URL_PREFIX}${filename}`;

export function Data(props: DataProps) {
  const [spec, specActions] = useUmweltSpec();

  const [recentFiles, setRecentFiles] = createStoredSignal<DataFile[]>('recentFiles', []);
  const [vegaDatasetsCache, setVegaDatasetsCache] = createStoredSignal<{ [f: string]: UmweltDataset }>('vegaDatasetsCache', {});

  // if spec.data is not set, initialize with most recently uploaded file or example dataset
  createEffect(() => {
    if (!spec.data || !spec.data.length) {
      const recent = recentFiles();
      if (recent.length) {
        specActions.initializeData(recent[0].data);
      } else {
        loadDataFromVegaDatasets(vegaDatasets[0]);
      }
    }
  });

  const loadDataFromUpload = (filename: string, data: UmweltDataset) => {
    const nextRecentFiles = [...recentFiles()];
    // if filename already exists, remove it
    const index = nextRecentFiles.findIndex((file) => file.filename === filename);
    if (index > -1) {
      nextRecentFiles.splice(index, 1);
    }
    // add file to the beginning
    nextRecentFiles.unshift({ filename, data });
    if (nextRecentFiles.length > 5) {
      // keep only 5 most recent files
      nextRecentFiles.pop();
    }
    setRecentFiles(nextRecentFiles);
    // set to selected dataset
    specActions.initializeData(data);
  };

  const loadDataFromRecentFile = (filename: string) => {
    const file = recentFiles().find((file) => file.filename === filename);
    if (file) {
      specActions.initializeData(file.data);
    }
  };

  const loadDataFromVegaDatasets = (filename: string) => {
    const cache = vegaDatasetsCache();
    if (cache[filename]) {
      specActions.initializeData(cache[filename]);
      return;
    }
    getData(vegaDataUrl(filename)).then((data) => {
      if (data && data.length) {
        specActions.initializeData(data);
        setVegaDatasetsCache({ ...cache, [filename]: data });
      }
    });
  };

  const DataTable = () => {
    return (
      <>
        {!spec.data || !spec.data.length ? (
          'No dataset loaded'
        ) : (
          <table>
            <thead>
              <tr>
                {Object.keys(spec.data[0]).map((key) => (
                  <th>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.data.map((row) => (
                <tr>
                  {Object.entries(row).map(([fieldName, value]) => (
                    <td>
                      {spec.fields.find((f) => f.name === fieldName)
                        ? fmtValue(
                            value,
                            spec.fields.find((f) => f.name === fieldName)
                          )
                        : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  };

  return (
    <div role="tabpanel" id="tabpanel-data" aria-labelledby="tab-data" hidden={props.currentTab !== 'data'}>
      <h2>Data</h2>
      <DataTable />
      <h3>Upload JSON or CSV file</h3>
      <UploadData loadDataFromUpload={loadDataFromUpload} />
      <h3>Recently uploaded files</h3>
      {recentFiles().length > 0
        ? recentFiles().map((file) => {
            return (
              <div>
                <label>
                  <input type="radio" name="recent_files" checked={JSON.stringify(file.data) === JSON.stringify(spec.data)} onChange={(e) => loadDataFromRecentFile(e.target.value)} value={file.filename} />
                  {file.filename}
                </label>
                <button onClick={() => setRecentFiles(recentFiles().filter((f) => f.filename !== file.filename))}>Remove {file.filename}</button>
              </div>
            );
          })
        : 'No files uploaded.'}
      <h3>Example datasets</h3>
      {vegaDatasets.map((filename) => {
        return (
          <div>
            <label>
              <input type="radio" name="example_datasets" checked={JSON.stringify(vegaDatasetsCache()[filename]) === JSON.stringify(spec.data)} onChange={(e) => loadDataFromVegaDatasets(e.target.value)} value={filename} />
              {filename}
            </label>
          </div>
        );
      })}
    </div>
  );
}
