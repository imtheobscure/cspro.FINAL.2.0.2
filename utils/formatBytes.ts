/**
 * Human-readable byte sizes: `1258291` → `1.20 MB`.
 *
 * Shared rather than copied: the cloud quota on the save card and the MySQL storage report in the
 * Super Admin Console must read the same way, and a second copy is how `1.20 MB` turns into
 * `1.2 MB` in one place and `1228 KB` in the other. GB is handled because a host account's real
 * table size can cross a gigabyte, and printing that as `2048.00 MB` hides the problem.
 */
export const formatBytes = (bytes: number): string => {
    const value = Math.max(0, Number(bytes) || 0);
    if (value < 1024) return `${Math.round(value)} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
