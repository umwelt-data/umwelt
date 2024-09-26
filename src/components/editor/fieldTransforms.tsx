import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDef } from '../../types';
import { createSignal } from 'solid-js';
import { TimeUnit } from 'vega';

interface FieldTransformsProps {
  field: FieldDef;
  fieldLabelId: string;
}

const aggregateOps: NonArgAggregateOp[] = ['mean', 'median', 'min', 'max', 'sum', 'count'];
const timeUnits = ['year', 'month', 'yearmonth', 'day', 'date', 'hours', 'minutes', 'seconds'];

export function FieldTransforms({ field, fieldLabelId }: FieldTransformsProps) {
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

  const AggregateFieldOptions = () => {
    if (canAggregateField(spec.key, field)) {
      return (
        <div>
          <label>
            Aggregate
            <select aria-describedby={fieldLabelId} value={field.aggregate} onChange={(e) => specActions.setFieldAggregate(field.name, e.target.value as NonArgAggregateOp)}>
              <option value="undefined">None</option>
              {aggregateOps.map((aggregateOp) => {
                return <option value={aggregateOp}>{aggregateOp}</option>;
              })}
            </select>
          </label>
        </div>
      );
    }
  };

  const BinFieldOptions = () => {
    if (canBinField(field)) {
      return (
        <div>
          <label>
            Bin
            <input aria-describedby={fieldLabelId} type="checkbox" checked={field.bin} onChange={(e) => specActions.setFieldBin(field.name, e.target.checked)} />
          </label>
        </div>
      );
    }
  };

  const TimeUnitFieldOptions = () => {
    if (canTimeUnitField(field)) {
      return (
        <div>
          <label>
            Time unit
            <select aria-describedby={fieldLabelId} value={field.timeUnit} onChange={(e) => specActions.setFieldTimeUnit(field.name, e.target.value as TimeUnit)}>
              <option value="undefined">None</option>
              {timeUnits.map((timeUnit) => {
                return <option value={timeUnit}>{timeUnit}</option>;
              })}
            </select>
          </label>
        </div>
      );
    }
  };

  if (canAggregateField(spec.key, field) || canBinField(field) || canTimeUnitField(field)) {
    return (
      <>
        <AggregateFieldOptions />
        <BinFieldOptions />
        <TimeUnitFieldOptions />
      </>
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
//             <select aria-describedby={fieldLabelId} value={field.aggregate} onChange={(e) => onSelectFieldProperty(field, 'aggregate', e.target.value)}>
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
//             <input aria-describedby={fieldLabelId} type="checkbox" checked={field.bin} onChange={(e) => onSelectFieldProperty(field, 'bin', e.target.checked)} />
//           </label>
//         </div>
//       ) : null}
//       {field.type === 'temporal' ? (
//         <div className="def-property">
//           <label>
//             Time unit
//             <select aria-describedby={fieldLabelId} value={field.timeUnit} onChange={(e) => onSelectFieldProperty(field, 'timeUnit', e.target.value)}>
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
