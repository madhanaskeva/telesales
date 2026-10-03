// Table footer: "PAGE 1 / 3 · …" with Prev / Next (and any extra buttons)
export default function Pager({ label, page, totalPages, onPage, children, className = 'table-pager', live }) {
  return (
    <div className={className}>
      <span className="pager-label" aria-live={live ? 'polite' : undefined}>{label}</span>
      <div className="pager-actions">
        {onPage && (
          <>
            <button type="button" className="filter-chip" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
            <button type="button" className="filter-chip" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next ›</button>
          </>
        )}
        {children}
      </div>
    </div>
  );
}

