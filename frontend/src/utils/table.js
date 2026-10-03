// Clamp a stored page into 1…totalPages and return the rows of that page
export function paginate(rows, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { page: current, totalPages, rows: rows.slice((current - 1) * pageSize, current * pageSize) };
}
