import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { FieldDef, MeasureType } from '../../types';
import { getDomain } from '../../util/domain';
import dayjs from 'dayjs';
import { isString } from 'vega';
import { isNumeric } from 'vega-lite';

export type FieldDefinitionProps = {
  field: FieldDef;
};

export function FieldDefinition(props: FieldDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();
  const { field } = props;

  const assignableMtypes = (field: FieldDef) => {
    const mtypes = ['nominal', 'ordinal'];
    const domain = getDomain({ ...field, field: field.name }, spec.data);
    if (domain.every((v) => dayjs(v).isValid())) {
      mtypes.push('temporal');
    }
    if (domain.every((v) => (v ? Number(v) === v || (isString(v) && isNumeric(v)) : true))) {
      mtypes.push('quantitative');
    }
    return mtypes;
  };

  return (
    <div>
      <h4 id={`label-${field.name}`}>{field.name}</h4>
      <label>
        Type
        <select
          aria-describedby={`label-${field.name}`}
          value={field.type}
          onChange={(e) => {
            specActions.setFieldType(field.name, e.target.value as MeasureType);
          }}
        >
          {assignableMtypes(field).map((mtype) => {
            return <option value={mtype}>{mtype}</option>;
          })}
        </select>
      </label>
      <div>
        <div>Encodings</div>
        <div></div>
      </div>
    </div>
  );
}
