import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, EncodingPropName, FieldDef, MeasureType, VisualPropName, audioPropNames, visualPropNames } from '../../types';
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

  const commonPropNames = ['x', 'y', 'color', 'pitch'].reverse();
  const propertyNames: EncodingPropName[] = [...visualPropNames, ...audioPropNames].sort((a, b) => {
    const aIndex = commonPropNames.indexOf(a);
    const bIndex = commonPropNames.indexOf(b);
    return bIndex - aIndex;
  });

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

  const assignablePropertyNames = (): string[] => {
    return propertyNames.filter((propName) => {
      if (visualPropNames.includes(propName as VisualPropName)) {
        return spec.visual.units.some((unit) => !unit.encoding[propName as VisualPropName]);
      } else if (audioPropNames.includes(propName as AudioPropName)) {
        return spec.audio.units.some((unit) => !unit.encoding[propName as AudioPropName]);
      }
      return false;
    });
  };

  const assignableUnitsForProperty = (propName: string): string[] => {
    if (visualPropNames.includes(propName as VisualPropName)) {
      return spec.visual.units.filter((unit) => !unit.encoding[propName as VisualPropName]?.field).map((unit) => unit.name);
    } else if (audioPropNames.includes(propName as AudioPropName)) {
      return spec.audio.units.filter((unit) => !unit.encoding[propName as AudioPropName]?.field).map((unit) => unit.name);
    }
    return [];
  };

  const addEncoding = (field: FieldDef) => {
    const validPropNames = assignablePropertyNames();
    let propName: EncodingPropName;
    if (field.type === 'quantitative') {
      propName = ['y', 'x', 'pitch', 'volume', 'opacity', 'size', 'duration'].find((propName) => validPropNames.includes(propName)) || validPropNames[0];
    } else if (field.type === 'temporal') {
      propName = ['x', 'y', 'pitch', 'volume', 'opacity', 'size', 'duration'].find((propName) => validPropNames.includes(propName)) || validPropNames[0];
    } else {
      propName = ['color', 'shape'].find((propName) => validPropNames.includes(propName)) || validPropNames[0];
    }
    const unitName: string = assignableUnitsForProperty(propName)[0];
    specActions.addEncoding(field.name, propName, unitName);
  };

  const changeEncodingProp = (field: FieldDef, oldPropName: EncodingPropName, newPropName: EncodingPropName, unitName: string) => {
    specActions.removeEncoding(field.name, oldPropName, unitName);
    const validUnits = assignableUnitsForProperty(newPropName);
    const newUnitName = validUnits.includes(unitName) ? unitName : validUnits[0];
    specActions.addEncoding(field.name, newPropName, newUnitName);
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
        <div>
          {field.encodings.length < propertyNames.length ? (
            <button aria-describedby={`label-${field.name}`} onClick={() => addEncoding(field)}>
              Add encoding
            </button>
          ) : null}
          {field.encodings.map((encodingRef) => {
            return (
              <div>
                <select
                  aria-describedby={`label-${field.name}`}
                  value={encodingRef.property}
                  onChange={(e) => {
                    changeEncodingProp(field, encodingRef.property, e.target.value, encodingRef.unit);
                  }}
                >
                  {!assignablePropertyNames().includes(encodingRef.property) ? <option value={encodingRef.property}>{encodingRef.property}</option> : null}
                  {assignablePropertyNames().map((propName) => {
                    return <option value={propName}>{propName}</option>;
                  })}
                </select>
                {(visualPropNames.includes(encodingRef.property as any) && spec.visual.units.length > 1) || (audioPropNames.includes(encodingRef.property as any) && spec.audio.units.length > 1) ? (
                  <select aria-describedby={`label-${field.name}`} value={encodingRef.unit} onChange={(e) => {}}>
                    {!assignableUnitsForProperty(encodingRef.property).includes(encodingRef.unit) ? <option value={encodingRef.unit}>{encodingRef.unit}</option> : null}
                    {assignableUnitsForProperty(encodingRef.property).map((unitName) => {
                      return <option value={unitName}>{unitName}</option>;
                    })}
                  </select>
                ) : null}
                {/* <button id={`field-${field.name}-${encodingRef.property}`} onClick={() => {}}>
                  Go to {visualPropNames.includes(encodingRef.property as any) ? 'visual' : 'audio'} tab
                </button> */}
                <button
                  onClick={() => {
                    specActions.removeEncoding(field.name, encodingRef.property, encodingRef.unit);
                  }}
                >
                  Remove encoding
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
