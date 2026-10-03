// Page title + subtitle on the left, actions on the right
export default function PageHeader({ title, subtitle, children, actionsClass = 'page-actions', titleId }) {
  return (
    <div className="section-header">
      <div className="section-title">
        <h1 className="page-title" id={titleId}>{title}</h1>
        {subtitle !== undefined && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && (actionsClass ? <div className={actionsClass}>{children}</div> : children)}
    </div>
  );
}
