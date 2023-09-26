export function validateSpec(spec: UmweltSpec) {
  if (!spec.data) {
    return false;
  }
  if (!(spec.fields && spec.fields.length)) {
    return false;
  }
  return true;
}
