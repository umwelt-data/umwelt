import { For, Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { TextPredicateNode, MeasureType } from '../../types';
import type { TextTarget } from '../../contexts/UmweltSpecContext';
import { getFieldDef } from '../../util/spec';
import type { FieldPredicate } from '@umwelt-data/umwelt-utils/predicate';
import { EncodingColumn, EncodingRow, InputRow } from '../ui/styled';

export type TextPredicateEditorProps = {
  target: TextTarget;
  node: TextPredicateNode;
};

// Operators exposed in the clause builder, curated per field type below.
const OPS = [
  { op: 'equal', label: 'is' },
  { op: 'oneOf', label: 'is one of' },
  { op: 'lt', label: '<' },
  { op: 'lte', label: '≤' },
  { op: 'gt', label: '>' },
  { op: 'gte', label: '≥' },
  { op: 'range', label: 'in range' },
  { op: 'valid', label: 'is valid' },
] as const;
type Op = (typeof OPS)[number]['op'];

function opsForType(type: MeasureType | undefined): Op[] {
  if (type === 'quantitative' || type === 'temporal') return ['equal', 'lt', 'lte', 'gt', 'gte', 'range', 'valid'];
  return ['equal', 'oneOf', 'valid'];
}

function clauseOp(clause: FieldPredicate): Op {
  for (const { op } of OPS) if (op in clause) return op;
  return 'equal';
}

// Coerce raw input text to the value type olli/vega compares against.
function coerce(type: MeasureType | undefined, raw: string): string | number | Date {
  if (type === 'quantitative') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === 'temporal') {
    const d = new Date(raw);
    return isNaN(+d) ? raw : d;
  }
  return raw;
}

function displayValue(v: unknown): string {
  if (v instanceof Date) return isNaN(+v) ? '' : v.toISOString().slice(0, 10);
  return v == null ? '' : String(v);
}

// Native input type for a value field, so temporal fields get a date picker and
// quantitative fields a number spinner. (Multi-value `oneOf` stays plain text.)
function inputType(fieldType: MeasureType | undefined, op: string): 'date' | 'number' | 'text' {
  if (op === 'oneOf') return 'text';
  if (fieldType === 'temporal') return 'date';
  if (fieldType === 'quantitative') return 'number';
  return 'text';
}

export function TextPredicateEditor(props: TextPredicateEditorProps) {
  const [spec, specActions] = useUmweltSpec();

  const clauses = (): FieldPredicate[] => {
    const pred = props.node.predicate as any;
    return Array.isArray(pred?.and) ? pred.and : [];
  };

  const typeOf = (field: string) => getFieldDef(spec, field)?.type;

  // Rebuild a clause from its parts, defaulting the value shape to the operator.
  const build = (field: string, op: Op, a: string, b: string): FieldPredicate => {
    const t = typeOf(field);
    switch (op) {
      case 'oneOf':
        return { field, oneOf: a.split(',').map((s) => coerce(t, s.trim())).filter((v) => v !== '') } as FieldPredicate;
      case 'range':
        return { field, range: [coerce(t, a), coerce(t, b)] } as unknown as FieldPredicate;
      case 'valid':
        return { field, valid: true } as FieldPredicate;
      default:
        return { field, [op]: coerce(t, a) } as unknown as FieldPredicate;
    }
  };

  const set = (index: number, clause: FieldPredicate) => specActions.setTextPredicateClause(props.target, props.node.id, index, clause);

  return (
    <EncodingColumn>
      <InputRow>
        <label>
          Highlight name
          <input value={props.node.name ?? ''} placeholder="e.g. After 1975" onInput={(e) => specActions.setTextNodeName(props.target, props.node.id, e.currentTarget.value)} />
        </label>
      </InputRow>

      <For each={clauses()}>
        {(clause, i) => {
          const op = () => clauseOp(clause);
          const field = () => (clause as any).field ?? '';
          const rawA = () => {
            const c = clause as any;
            if (op() === 'oneOf') return (c.oneOf ?? []).map(displayValue).join(', ');
            if (op() === 'range') return displayValue(c.range?.[0]);
            if (op() === 'valid') return '';
            return displayValue(c[op()]);
          };
          const rawB = () => displayValue((clause as any).range?.[1]);
          return (
            <EncodingRow>
              <select value={field()} onChange={(e) => set(i(), build(e.currentTarget.value, op(), rawA(), rawB()))}>
                <option value="">(field)</option>
                <For each={spec.fields.filter((f) => f.active)}>{(f) => <option value={f.name}>{f.name}</option>}</For>
              </select>
              <select value={op()} onChange={(e) => set(i(), build(field(), e.currentTarget.value as Op, rawA(), rawB()))}>
                <For each={OPS.filter((o) => opsForType(typeOf(field())).includes(o.op))}>{(o) => <option value={o.op}>{o.label}</option>}</For>
              </select>
              <Show when={op() !== 'valid'}>
                <input type={inputType(typeOf(field()), op())} value={rawA()} placeholder={op() === 'oneOf' ? 'a, b, c' : 'value'} onInput={(e) => set(i(), build(field(), op(), e.currentTarget.value, rawB()))} />
              </Show>
              <Show when={op() === 'range'}>
                <input type={inputType(typeOf(field()), op())} value={rawB()} placeholder="to" onInput={(e) => set(i(), build(field(), op(), rawA(), e.currentTarget.value))} />
              </Show>
              <button onClick={() => specActions.removeTextPredicateClause(props.target, props.node.id, i())} aria-label="Remove condition">
                ✕
              </button>
            </EncodingRow>
          );
        }}
      </For>
      <div>
        <button onClick={() => specActions.addTextPredicateClause(props.target, props.node.id)}>Add condition</button>
      </div>
    </EncodingColumn>
  );
}
