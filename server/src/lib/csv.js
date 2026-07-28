import { parse } from 'csv-parse/sync';

export function parseCsvBuffer(buf) {
  const text = buf.toString('utf-8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: false, // we do our own targeted trimming so we can flag it in the report
    relax_column_count: true,
  });
}
