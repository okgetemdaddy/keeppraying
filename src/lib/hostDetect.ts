export const isKeepReading = (): boolean => {
  const h = window.location.hostname;
  return h.includes('keepread');
};
