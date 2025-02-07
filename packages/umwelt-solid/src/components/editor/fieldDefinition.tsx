import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, EncodingPropName, FieldDef, MeasureType, VisualPropName, audioPropNames, isAudioProp, isVisualProp, visualPropNames } from '../../types';
import { getDomain } from '../../util/domain';
import dayjs from 'dayjs';
import { isString } from 'vega';
import { isNumeric } from 'vega-lite';
import { FieldTransforms } from './fieldTransforms';
import { resolveFieldDef } from '../../util/spec';
import { EnumeratedItem, InputRow, MONOSPACE } from '../ui/styled';
import { styled } from 'solid-styled-components';

export type FieldDefinitionProps = {
  field: FieldDef;
};

const FieldName = styled.h4`
  ${MONOSPACE}
`;

const EncodingContainer = styled.div`
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: 25% auto;
  gap: 1rem;
`;

const EncodingColumn = styled.div`
  > * {
    margin-bottom: 3px;
  }
`;

const EncodingRow = styled.div`
  display: flex;
  gap: 3px;
`;

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
    const domain = getDomain(resolveFieldDef(field), spec.data.values);
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
    let propName;
    if (field.type === 'quantitative') {
      propName = ['y', 'x', 'pitch', 'volume', 'opacity', 'size', 'duration'].find((propName) => validPropNames.includes(propName)) || (validPropNames[0] as EncodingPropName);
    } else if (field.type === 'temporal') {
      propName = ['x', 'y', 'pitch', 'volume', 'opacity', 'size', 'duration'].find((propName) => validPropNames.includes(propName)) || validPropNames[0];
    } else {
      propName = ['color', 'shape'].find((propName) => validPropNames.includes(propName)) || validPropNames[0];
    }
    const unitName = assignableUnitsForProperty(propName)[0];
    if (isVisualProp(propName) || isAudioProp(propName)) {
      specActions.addEncoding(field.name, propName, unitName);
    }
  };

  const changeEncodingProp = (field: FieldDef, oldPropName: EncodingPropName, newPropName: EncodingPropName, unitName: string) => {
    specActions.removeEncoding(field.name, oldPropName, unitName);
    const validUnits = assignableUnitsForProperty(newPropName);
    const newUnitName = validUnits.includes(unitName) ? unitName : validUnits[0];
    specActions.addEncoding(field.name, newPropName, newUnitName);
  };

  const fieldLabelId = `label-${field.name}`;

  return (
    <EnumeratedItem>
      <FieldName id={fieldLabelId}>{field.name}</FieldName>
      <InputRow>
        <label>
          Type
          <select
            aria-describedby={fieldLabelId}
            value={field.type}
            onChange={(e) => {
              specActions.setFieldType(field.name, e.target.value as MeasureType);
            }}
          >
            {assignableMtypes(field).map((mtype) => {
              return (
                <option value={mtype} selected={mtype === field.type}>
                  {mtype}
                </option>
              );
            })}
          </select>
        </label>
      </InputRow>
      <EncodingContainer>
        <div>Encodings</div>
        <EncodingColumn>
          {field.encodings.length < propertyNames.length ? (
            <button aria-describedby={fieldLabelId} onClick={() => addEncoding(field)}>
              Add encoding
            </button>
          ) : null}
          {field.encodings.map((encodingRef) => {
            return (
              <EncodingRow>
                <select
                  aria-describedby={fieldLabelId}
                  value={encodingRef.property}
                  onChange={(e) => {
                    changeEncodingProp(field, encodingRef.property, e.target.value as EncodingPropName, encodingRef.unit);
                  }}
                >
                  {!assignablePropertyNames().includes(encodingRef.property) ? <option value={encodingRef.property}>{encodingRef.property}</option> : null}
                  {assignablePropertyNames().map((propName) => {
                    return (
                      <option value={propName} selected={propName === encodingRef.property}>
                        {propName}
                      </option>
                    );
                  })}
                </select>
                {(visualPropNames.includes(encodingRef.property as any) && spec.visual.units.length > 1) || (audioPropNames.includes(encodingRef.property as any) && spec.audio.units.length > 1) ? (
                  <select
                    aria-describedby={fieldLabelId}
                    value={encodingRef.unit}
                    onChange={(e) => {
                      specActions.addEncoding(field.name, encodingRef.property, e.currentTarget.value);
                      specActions.removeEncoding(field.name, encodingRef.property, encodingRef.unit);
                    }}
                  >
                    {!assignableUnitsForProperty(encodingRef.property).includes(encodingRef.unit) ? <option value={encodingRef.unit}>{encodingRef.unit}</option> : null}
                    {assignableUnitsForProperty(encodingRef.property).map((unitName) => {
                      return (
                        <option value={unitName} selected={unitName === encodingRef.unit}>
                          {unitName}
                        </option>
                      );
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
              </EncodingRow>
            );
          })}
        </EncodingColumn>
      </EncodingContainer>
      <FieldTransforms fieldName={field.name} fieldLabelId={fieldLabelId} />
    </EnumeratedItem>
  );
}
