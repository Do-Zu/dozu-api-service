const isEmptyObject = (obj: object | null | undefined) => {
  if (!obj) return false;

  return Object.keys(obj).length === 0;
};

export { isEmptyObject };
