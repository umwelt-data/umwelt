import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { parseDelimited } from '@umwelt-data/umwelt-utils/data';
import { isString } from 'vega';
import { UmweltDataset } from '../../types';

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
            const data = parseDelimited(contents);
            if (data.length) {
              props.loadDataFromUpload(file.name, data);
            } else {
              console.error('Could not parse uploaded file as JSON or CSV');
            }
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
        <p>A JSON file should be an array of objects where each object represents a row of data.</p>
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
        <p>A CSV file should have a header row with column names.</p>
        <pre>
          <code>{`name,age\nAlice,34\nBob,56`}</code>
        </pre>
      </details>
      <br />
      <input type="file" onChange={(e) => onUploadDataFile(e)}></input>
    </>
  );
}
