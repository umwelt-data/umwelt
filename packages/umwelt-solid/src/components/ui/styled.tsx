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
