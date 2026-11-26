/**
 * «Letto di recente» on the Scrivania (L-87): the last five rows of the Cronologia, as the desk's lists, and the way to
 * the whole page. Nothing is drawn while it is read, when it is empty or when it cannot be read (logged: the history is
 * a convenience).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { getHistory, type SearchHistoryItem } from '../../../services/historyService';
import { identityFromKey } from '../../../utils/decisionLinks';
import { isAuthenticated } from '../../../services/authService';
import { buttonClassName } from '../../ui/buttonStyles';
import { actHeadingOf, HISTORY_PUT_BACK_EVENT, historyLabel, isRowShown, kindOf, searchParamsOf } from './historyRows';

const SHOWN = 5;

export function RecentHistory({ rowClassName }: { rowClassName: string }) {
  const [rows, setRows] = useState<SearchHistoryItem[]>([]);
  const navigate = useNavigate();
  const triggerSearch = useAppStore((s) => s.triggerSearch);
  const openDecision = useAppStore((s) => s.openDecision);

  useEffect(() => {
    // The history is per user: nothing to read without a login.
    if (!isAuthenticated()) return;
    let live = true;
    // A few more than shown: rows removed behind an «Annulla» still on screen are left out.
    const read = () => getHistory(SHOWN * 2, 0)
      .then((all) => { if (live) setRows(all.filter((r) => isRowShown(r) && (!r.decision_key || identityFromKey(r.decision_key))).slice(0, SHOWN)); })
      .catch((err) => console.error('history: reading the recent rows failed', err));
    void read();
    window.addEventListener(HISTORY_PUT_BACK_EVENT, read);
    return () => { live = false; window.removeEventListener(HISTORY_PUT_BACK_EVENT, read); };
  }, []);

  if (rows.length === 0) return null;

  const open = (item: SearchHistoryItem) => {
    const identity = item.decision_key ? identityFromKey(item.decision_key) : null;
    if (identity) openDecision(identity, { fromLink: true });
    else triggerSearch(searchParamsOf(item));
    navigate('/');
  };

  return (
    <section className="mt-14 max-md:mt-10" aria-labelledby="scrivania-recenti">
      <div className="mb-3 flex items-baseline justify-between gap-4 max-md:mb-2">
        <h2 id="scrivania-recenti" className="font-serif text-2xl font-medium text-slate-900 max-md:text-xl dark:text-slate-50">Letto di recente</h2>
        <Link to="/history" className={buttonClassName('link')}>Tutta la cronologia</Link>
      </div>
      <ul className="border-b border-slate-200 dark:border-slate-800">
        {rows.map((item) => (
          <li key={item.id}>
            {/* bare-button: a row of the list that is a whole option, the citation and its act. */}
            <button className={rowClassName} onClick={() => open(item)}>
              <span className="hidden w-36 shrink-0 text-sm text-slate-500 sm:block dark:text-slate-400">{kindOf(item)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[19px] text-slate-900 max-md:text-[17px] dark:text-slate-50">{historyLabel(item)}</span>
                {actHeadingOf(item) && <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{actHeadingOf(item)}</span>}
              </span>
              <ArrowUpRight aria-hidden="true" size={16} className="shrink-0 text-slate-400 transition-colors group-hover:text-primary-600" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
