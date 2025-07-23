import { createSignal } from 'solid-js';
import { getData } from '../../util/datasets';
import { UmweltDataset } from '../../types';
import { FormRow, FlexInput, ErrorText } from '../ui/styled';

interface LoadDataFromURLProps {
  loadDataFromURL: (url: string, data: UmweltDataset) => void;
}

export function LoadDataFromURL(props: LoadDataFromURLProps) {
  const [url, setUrl] = createSignal<string>('');
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>('');

  const onLoadFromURL = async () => {
    const urlValue = url().trim();
    if (!urlValue) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getData(urlValue);
      if (data && data.length > 0) {
        props.loadDataFromURL(urlValue, data);
        setUrl(''); // Clear the input on success
      } else {
        setError('No data found at the provided URL');
      }
    } catch (err) {
      console.error('Failed to load data from URL:', err);
      setError('Failed to load data from URL. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FormRow
        onSubmit={(e) => {
          e.preventDefault();
          onLoadFromURL();
        }}
      >
        <FlexInput type="url" placeholder="Enter URL to JSON or CSV data..." value={url()} onInput={(e) => setUrl(e.target.value)} disabled={loading()} />
        <button type="submit" disabled={loading() || !url().trim()}>
          {loading() ? 'Loading...' : 'Load'}
        </button>
      </FormRow>
      {error() && <ErrorText>{error()}</ErrorText>}
      <details>
        <summary>Supported URL formats</summary>
        <p>URLs should point to JSON or CSV data files. Examples:</p>
        <ul>
          <li>JSON: Array of objects with consistent structure</li>
          <li>CSV: File with header row containing column names</li>
        </ul>
        <p>The data will be fetched and loaded into your visualization.</p>
      </details>
    </div>
  );
}
