import { Accessor, createEffect, createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { getData } from '../../util/datasets';

export type DataProps = {
  currentTab: Accessor<string>;
};

export function Data(props: DataProps) {
  const [_, specActions] = useUmweltSpec();

  const [dataUrl, setDataUrl] = createSignal('https://raw.githubusercontent.com/vega/vega-datasets/master/data/stocks.csv');
  createEffect(() => {
    getData(dataUrl()).then((data) => {
      if (data && data.length) {
        specActions.initializeData(data);
      }
    });
  });

  const vegaDatasets = ['stocks.csv', 'cars.json', 'weather.csv', 'seattle-weather.csv', 'penguins.json', 'driving.json', 'barley.json', 'disasters.csv', 'gapminder.json'];

  const onUploadDataFile = (e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }) => {
    const fileList = e.target.files;
    if (fileList?.length) {
      const file = fileList[0];
      const reader = new FileReader();

      reader.onload = function (loadedEvent: ProgressEvent<FileReader>) {
        // result contains loaded file.
        const contents = loadedEvent.target?.result;
        if (contents) {
          try {
            const data = JSON.parse(contents as string);
            specActions.initializeData(data);
          } catch (e) {
            console.error('uploaded file was not successfully parsed as json');
          }
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <div role="tabpanel" id="tabpanel-data" aria-labelledby="tab-data" hidden={props.currentTab() !== 'data'}>
      <h2>Data</h2>

      <div>
        <label>
          Choose example dataset
          <br />
          <select
            onChange={(e) => {
              const url = e.currentTarget.value;
              setDataUrl(url);
            }}
          >
            {vegaDatasets.map((url) => {
              return <option value={`https://raw.githubusercontent.com/vega/vega-datasets/master/data/${url}`}>{url}</option>;
            })}
          </select>
        </label>
      </div>
      <p>or</p>
      <div>
        <label>
          Upload JSON file <br />
          <input type="file" onChange={(e) => onUploadDataFile(e)}></input>
        </label>
      </div>
    </div>
  );
}
