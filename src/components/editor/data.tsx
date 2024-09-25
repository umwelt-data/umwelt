import { Accessor, createEffect, createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { getData } from '../../util/datasets';
import { UmweltDataset } from '../../types';
import { createStoredSignal } from '../../util/solid';
import { UploadData } from './uploadData';

export type DataProps = {
  currentTab: Accessor<string>;
};

interface UploadedFile {
  filename: string;
  data: UmweltDataset;
}

const vegaDatasets = ['stocks.csv', 'cars.json', 'weather.csv', 'seattle-weather.csv', 'penguins.json', 'driving.json', 'barley.json', 'disasters.csv', 'gapminder.json'];
const VEGA_DATA_URL_PREFIX = 'https://raw.githubusercontent.com/vega/vega-datasets/master/data/';

export function Data(props: DataProps) {
  const [_, specActions] = useUmweltSpec();

  const [recentFiles, setRecentFiles] = createStoredSignal<UploadedFile[]>('recentFiles', []);
  const [selectedDataset, setSelectedDataset] = createSignal<string>();

  const updateRecentFiles = (filename: string, data: UmweltDataset) => {
    const nextRecentFiles = [...recentFiles()];
    // if file already exists, remove it
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
  };

  const vegaDataUrl = (filename: string) => `${VEGA_DATA_URL_PREFIX}${filename}`;

  const setDataFromUrl = (url: string) => {
    getData(url).then((data) => {
      if (data && data.length) {
        specActions.initializeData(data);
      }
    });
  };

  // default to most recently uploaded file, or first example if no files uploaded
  createEffect(() => {
    if (recentFiles().length) {
      const mostRecent = recentFiles()[0];
      setSelectedDataset(mostRecent.filename);
    } else {
      setSelectedDataset(vegaDataUrl(vegaDatasets[0]));
    }
  });

  createEffect(() => {
    const dataset = selectedDataset();
    if (dataset) {
      if (dataset.startsWith(VEGA_DATA_URL_PREFIX)) {
        setDataFromUrl(dataset);
      } else {
        const file = recentFiles().find((file) => file.filename === dataset);
        if (file) {
          specActions.initializeData(file.data);
        }
      }
    }
  });

  const printCurrentDataset = () => {
    const filename = selectedDataset();
    if (filename && filename.startsWith(VEGA_DATA_URL_PREFIX)) {
      return filename.substring(VEGA_DATA_URL_PREFIX.length);
    }
    return filename;
  };

  return (
    <div role="tabpanel" id="tabpanel-data" aria-labelledby="tab-data" hidden={props.currentTab() !== 'data'}>
      <h2>Data</h2>
      Current dataset: {printCurrentDataset()}
      <p>Choose a dataset from the list below, or upload a new dataset.</p>
      <UploadData updateRecentFiles={updateRecentFiles} />
      <h3>Recently uploaded files</h3>
      {recentFiles().length > 0
        ? recentFiles().map((file) => {
            return (
              <label>
                <input type="radio" name="choose_dataset" checked={selectedDataset() === file.filename} onChange={(e) => setSelectedDataset(e.target.value)} value={file.filename} />
                {file.filename}
              </label>
            );
          })
        : 'No files uploaded.'}
      <h3>Example datasets</h3>
      {vegaDatasets.map((filename) => {
        return (
          <div>
            <label>
              <input type="radio" name="choose_dataset" checked={selectedDataset() === vegaDataUrl(filename)} onChange={(e) => setSelectedDataset(e.target.value)} value={vegaDataUrl(filename)} />
              {filename}
            </label>
          </div>
        );
      })}
    </div>
  );
}
