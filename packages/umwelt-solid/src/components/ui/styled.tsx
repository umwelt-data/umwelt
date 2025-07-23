import { styled } from 'solid-styled-components';

// this is meant to be a wrapper around a <label> element with some kind of input nested inside it
export const InputRow = styled('div')`
  margin-bottom: 3px;

  label {
    display: grid;
    grid-template-columns: 25% auto;
    align-items: center;
    gap: 1rem;
  }

  label > * {
    justify-self: start;
  }
`;

export const MONOSPACE = `
  font-family: monospace;
`;

export const EnumeratedItem = styled('div')`
  border-left: 1px solid #ccc;
  padding-left: 1rem;
`;

export const FormRow = styled('form')`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

export const FlexInput = styled('input')`
  flex: 1;
`;

export const ErrorText = styled('div')`
  color: red;
  font-size: 14px;
`;

// Encoding and layout components
export const EncodingContainer = styled('div')`
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: 25% auto;
  gap: 1rem;

  h5 {
    margin: 0;
  }
`;

export const EncodingColumn = styled('div')`
  > * {
    margin-bottom: 3px;
  }
`;

export const EncodingRow = styled('div')`
  display: flex;
  gap: 3px;
`;

export const RowMargin = styled('div')`
  margin-top: 1em;
`;

// Semantic components
export const FieldName = styled('h4')`
  ${MONOSPACE}
`;

export const MonospaceText = styled('div')`
  ${MONOSPACE}
`;

export const StyledTable = styled('table')`
  border: 1px solid #ccc;
  ${MONOSPACE}
`;

export const RemoveUnitButton = styled('button')`
  margin-top: 1rem;
`;

export const LabelButtonRow = styled('div')`
  display: flex;
  align-items: center;
  gap: 8px;
`;
