import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDef } from '../../types';

interface FieldTransformsProps {
  field: FieldDef;
}

const aggregateOps: NonArgAggregateOp[] = ['mean', 'median', 'min', 'max', 'sum', 'count'];
const timeUnits = ['year', 'month', 'yearmonth', 'day', 'date', 'hours', 'minutes', 'seconds'];

export function FieldTransforms(props: FieldTransformsProps) {
  const [spec, specActions] = useUmweltSpec();

  const canAggregateField = (key: string[], field: FieldDef) => {
    return !key.includes(field.name) && field.type === 'quantitative';
  };
  const canBinField = (field: FieldDef) => {
    return field.type === 'quantitative' || field.type === 'temporal';
  };
  const canTimeUnitField = (field: FieldDef) => {
    return field.type === 'temporal';
  };

  if (canAggregateField(spec.key, props.field) || canBinField(props.field) || canTimeUnitField(props.field)) {
    return (
      <details>
        <summary>Additional options</summary>
        {canAggregateField(spec.key, props.field) ? (
          <div>
            <label>
              Aggregate
              <select value={props.field.aggregate} onChange={(e) => specActions.setFieldAggregate(props.field.name, e.target.value as NonArgAggregateOp)}>
                <option value="">None</option>
                {aggregateOps.map((aggregateOp) => {
                  return <option value={aggregateOp}>{aggregateOp}</option>;
                })}
              </select>
            </label>
          </div>
        ) : null}
      </details>
    );
  }

  return null;
}

// {
//   (!key.includes(field.name) && field.type === 'quantitative') || field.type === 'quantitative' || field.type === 'temporal' ? (
//     <details>
//       <summary>Additional options</summary>
//       {!key.includes(field.name) && field.type === 'quantitative' ? (
//         <div className="def-property">
//           <label>
//             Aggregate
//             <select aria-describedby={`label-${field.name}`} value={field.aggregate} onChange={(e) => onSelectFieldProperty(field, 'aggregate', e.target.value)}>
//               <option value="">None</option>
//               {aggregateOps.map((aggregateOp) => {
//                 return (
//                   <option key={aggregateOp} value={aggregateOp}>
//                     {aggregateOp}
//                   </option>
//                 );
//               })}
//             </select>
//           </label>
//         </div>
//       ) : null}
//       {field.type === 'quantitative' || field.type === 'temporal' ? (
//         <div className="def-property">
//           <label>
//             Bin
//             <input aria-describedby={`label-${field.name}`} type="checkbox" checked={field.bin} onChange={(e) => onSelectFieldProperty(field, 'bin', e.target.checked)} />
//           </label>
//         </div>
//       ) : null}
//       {field.type === 'temporal' ? (
//         <div className="def-property">
//           <label>
//             Time unit
//             <select aria-describedby={`label-${field.name}`} value={field.timeUnit} onChange={(e) => onSelectFieldProperty(field, 'timeUnit', e.target.value)}>
//               <option value="">None</option>
//               {timeUnits.map((timeUnit) => {
//                 return (
//                   <option key={timeUnit} value={timeUnit}>
//                     {timeUnit}
//                   </option>
//                 );
//               })}
//             </select>
//           </label>
//         </div>
//       ) : null}
//       {/* <div className='def-property'>
//         <label>
//           Scale
//           (todo: domain, zero, nice)
//           </label>
//       </div>
//       <div className='def-property'>
//         <label>
//           Sort
//           (todo: ascending, descending, by encoding, by field, etc)
//         </label>
//       </div> */}
//     </details>
//   ) : null;
// }
