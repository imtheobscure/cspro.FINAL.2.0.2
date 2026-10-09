export const escapeHtml = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const safeJsonStringify = (obj: any): string => {
  return JSON.stringify(obj)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
};
