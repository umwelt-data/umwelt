import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import Papa from 'papaparse';
import { isString } from 'vega';
import { UmweltDataset, UmweltDatum } from '../../types';

interface UploadDataProps {
  loadDataFromUpload: (filename: string, data: UmweltDataset) => void;
}

export function UploadData(props: UploadDataProps) {
  const onUploadDataFile = (e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }) => {
    const fileList = e.target.files;
    if (fileList?.length) {
      const file = fileList[0];
      const reader = new FileReader();

      reader.onload = function (loadedEvent: ProgressEvent<FileReader>) {
        // result contains loaded file.
        const contents = loadedEvent.target?.result;
        if (contents && isString(contents)) {
          try {
            const data = JSON.parse(contents);
            props.loadDataFromUpload(file.name, data);
          } catch (e) {
            // try to parse as csv
            Papa.parse<UmweltDatum>(contents, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                if (results.errors.length) {
                  console.error('Errors while parsing csv:', results.errors);
                } else {
                  props.loadDataFromUpload(file.name, results.data);
                }
              },
            });
          }
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <>
      <details>
        <summary>Accepted file formats</summary>
        <p>A JSON file should be an array of objects where each object represents a row of data. Example:</p>
        <pre>
          <code>
            {JSON.stringify(
              [
                { name: 'Alice', age: 34 },
                { name: 'Bob', age: 56 },
              ],
              null,
              2
            )}
          </code>
        </pre>
        <p>A CSV file should have a header row with column names. Example:</p>
        <pre>
          <code>{`name,age\nAlice,34\nBob,56`}</code>
        </pre>
      </details>
      <br />
      <input type="file" onChange={(e) => onUploadDataFile(e)}></input>
    </>
  );
}
