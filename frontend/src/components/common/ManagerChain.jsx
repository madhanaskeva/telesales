// "Managed by" cell: the reporting chain from the top down to the direct manager (bold)
import { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { roleLabel } from '../../utils/format';
import { managerChain } from '../../utils/scope';

export default function ManagerChain({ user }) {
  const users = useSelector(s => s.users.list);
  const chain = managerChain(users, user);
  if (!chain.length) return <span className="mgr-chain-top">Top Level / Admin</span>;
  return chain.map((m, i) => (
    <Fragment key={m.id}>
      {i > 0 && <span className="mgr-chain-sep"> → </span>}
      <span className={`mgr-chain-item${i === chain.length - 1 ? ' is-direct' : ''}`}>{m.name} ({roleLabel(m.role)})</span>
    </Fragment>
  ));
}
