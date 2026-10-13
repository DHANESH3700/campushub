function toCsv(rows, headers) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.map((h) => escape(h.label)).join(',');
  const body = rows
    .map((row) => headers.map((h) => escape(typeof h.value === 'function' ? h.value(row) : row[h.value])).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

module.exports = { toCsv };
