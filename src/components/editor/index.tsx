import { useUmweltSpec } from '../../Context';

export function Editor() {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div>
      <h1>Editor</h1>
      <pre>
        <code>{JSON.stringify(spec, null, 2)}</code>
      </pre>
    </div>
  );
}
