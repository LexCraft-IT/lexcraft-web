/**
 * «Cronologia» (`/history`): the norms and decisions the user opened, a typographic list by day in the Scrivania's style
 * (L-87, the proposal of 18 Nov 2026). A row reopens its search, or its decision, at once; «⋯» adds it to a practice or
 * the frequent searches, or takes it off. Every removal — a row, a day, everything — is behind «Annulla», with no
 * question before (L-74, L-84). «Norme salvate aggiornate» lives on the Scrivania (L-88), and here too: with a practice
 * open the desk is not shown, and the avatar's count leads here (L-89).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus, MoreVertical, Plus, Search, Trash2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { MenuButton, type MenuItem } from '../../ui/MenuButton';
import { useAppStore } from '../../../store/useAppStore';
import { getHistory, type SearchHistoryItem } from '../../../services/historyService';
import { identityFromKey } from '../../../utils/decisionLinks';
import { labelFromParams } from '../../../utils/sources';
import type { NormaVisitata } from '../../../types';
import { PageFrame } from '../../layout/PageFrame';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { SegmentedTabs } from '../../ui/SegmentedTabs';
import { Toast } from '../../ui/Toast';
import { Arrive } from '../../ui/Arrive';
import { HistoryListSkeleton } from '../../ui/Skeleton';
import { NormaChangesSection } from './NormaChangesSection';
import {
  actHeadingOf, clearAllWithUndo, HISTORY_PUT_BACK_EVENT, historyLabel, isRowShown, kindOf, removeRowsWithUndo, searchParamsOf, timeOf,
} from './historyRows';

/** What the server sends at once (`GET /history`'s default); «Mostra i giorni precedenti» reads the next as many. */
const PAGE = 100;

type Kind = 'all' | 'norms' | 'decisions';
const KINDS = [
  { id: 'all', label: 'Tutto' },
  { id: 'norms', label: 'Norme' },
  { id: 'decisions', label: 'Sentenze' },
] as const;

/** «Oggi», «Ieri», «lunedì 16 novembre», «3 ottobre 2025». */
function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('it-IT', sameYear ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const byNewest = (a: SearchHistoryItem, b: SearchHistoryItem) => (b.created_at ?? '').localeCompare(a.created_at ?? '');

function toNorma(item: SearchHistoryItem): NormaVisitata {
  const params = searchParamsOf(item);
  return { tipo_atto: params.act_type, data: params.date, numero_atto: params.act_number || undefined, numero_articolo: params.article, versione: params.version };
}

export function HistoryView() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // The row whose «Nuova pratica…» asks its title, under it (it was a window over the page, L-73).
  const [newDossierFor, setNewDossierFor] = useState<string | null>(null);
  const [newDossierTitle, setNewDossierTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { triggerSearch, addQuickNorm, dossiers, addToDossier, createDossier, openDecision } = useAppStore();
  const navigate = useNavigate();

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => setFeedback({ message, type });

  const read = useCallback((rows: SearchHistoryItem[]) => {
    // Once per row here, not in the row.
    rows.forEach((item) => {
      if (item.decision_key && !identityFromKey(item.decision_key)) {
        console.error('history: unreadable decision key', { id: item.id, decision_key: item.decision_key });
      }
    });
    return rows.filter(isRowShown);
  }, []);

  useEffect(() => {
    getHistory(PAGE, 0)
      .then((rows) => {
        setHistory(read(rows));
        setMore(rows.length === PAGE);
      })
      .catch((err) => console.error('history: reading failed', err))
      .finally(() => setLoading(false));
  }, [read]);

  // «Annulla»: the rows come back where they were, here or on a page mounted since.
  useEffect(() => {
    const onPutBack = (event: Event) => {
      const back = (event as CustomEvent<SearchHistoryItem[]>).detail;
      setHistory((prev) => [...prev, ...back.filter((b) => !prev.some((p) => p.id === b.id))].sort(byNewest));
    };
    window.addEventListener(HISTORY_PUT_BACK_EVENT, onPutBack);
    return () => window.removeEventListener(HISTORY_PUT_BACK_EVENT, onPutBack);
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      // shortcut: an offset counted on the rows kept, so a removal behind «Annulla» meanwhile may skip one row; a cursor on `created_at` if it matters.
      const rows = await getHistory(PAGE, history.length);
      setHistory((prev) => [...prev, ...read(rows).filter((r) => !prev.some((p) => p.id === r.id))]);
      setMore(rows.length === PAGE);
    } catch (err) {
      console.error('history: reading more failed', err);
      showFeedback('Non riesco a leggere i giorni precedenti. Riprova.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = (rows: SearchHistoryItem[], message: string) => {
    const ids = new Set(rows.map((r) => r.id));
    setHistory((prev) => prev.filter((item) => !ids.has(item.id)));
    removeRowsWithUndo(rows, message, () => showFeedback('Non riesco a togliere la voce dalla cronologia: è tornata al suo posto.', 'error'));
  };

  const clearAll = () => {
    const all = history;
    setHistory([]);
    setMore(false);
    clearAllWithUndo(all, () => showFeedback('Non riesco a svuotare la cronologia: le voci sono tornate.', 'error'));
  };

  // Page-scoped shortcuts: «/» focuses the filter, Escape empties it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const inFilter = target === searchInputRef.current;
      const inOtherField = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !inFilter;
      if (e.key === '/' && !inOtherField && !inFilter) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && inFilter && searchTerm) {
        e.preventDefault();
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchTerm]);

  const open = (item: SearchHistoryItem) => {
    if (item.decision_key) {
      const identity = identityFromKey(item.decision_key);
      if (!identity) return;
      openDecision(identity, { fromLink: true });
      navigate('/');
      return;
    }
    navigate('/');
    triggerSearch(searchParamsOf(item));
  };

  const addTo = (item: SearchHistoryItem, dossierId: string) => {
    const identity = item.decision_key ? identityFromKey(item.decision_key) : null;
    if (identity) addToDossier(dossierId, { ...identity, etichetta: historyLabel(item) }, 'sentenza');
    else addToDossier(dossierId, toNorma(item), 'norma');
    showFeedback('Aggiunto alla pratica');
  };

  const createAndAdd = async (item: SearchHistoryItem) => {
    const title = newDossierTitle.trim();
    if (!title) return;
    setNewDossierFor(null);
    setNewDossierTitle('');
    const id = await createDossier(title);
    if (id) {
      addTo(item, id);
      showFeedback(`Creata «${title}» con la voce`);
    } else {
      showFeedback('Non riesco a creare la pratica. Riprova.', 'error');
    }
  };

  const menuItems = (item: SearchHistoryItem): MenuItem[] => {
    const canAdd = !item.decision_key || !!identityFromKey(item.decision_key);
    return [
      ...(item.decision_key ? [] : [{
        label: 'Aggiungi alle ricerche frequenti',
        icon: Zap,
        onSelect: () => {
          addQuickNorm(labelFromParams({ act_type: item.act_type ?? '', act_number: item.act_number, date: item.date, article: item.article?.toString() }), searchParamsOf(item));
          showFeedback('Aggiunta alle ricerche frequenti');
        },
      }]),
      ...(canAdd ? dossiers.map((dossier, i): MenuItem => ({
        label: dossier.title,
        ariaLabel: `Aggiungi a ${dossier.title}`,
        icon: FolderPlus,
        separatorBefore: i === 0 && !item.decision_key,
        sectionHeading: i === 0 ? 'Aggiungi a una pratica' : undefined,
        onSelect: () => addTo(item, dossier.id),
      })) : []),
      ...(canAdd ? [{
        label: 'Nuova pratica…',
        ariaLabel: 'Aggiungi a una nuova pratica…',
        icon: Plus,
        separatorBefore: dossiers.length === 0 && !item.decision_key,
        sectionHeading: dossiers.length === 0 ? 'Aggiungi a una pratica' : undefined,
        onSelect: () => { setNewDossierFor(item.id); setNewDossierTitle(''); },
      }] : []),
      { label: 'Togli dalla cronologia', icon: Trash2, danger: true, separatorBefore: canAdd, onSelect: () => remove([item], 'Tolta dalla cronologia') },
    ];
  };

  const filtered = useMemo(() => {
    const tokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return history.filter((item) => {
      if (kind === 'norms' && item.decision_key) return false;
      if (kind === 'decisions' && !item.decision_key) return false;
      if (tokens.length === 0) return true;
      const haystack = [item.act_type ?? '', item.act_number ?? '', item.article?.toString() ?? '', item.date ?? '', historyLabel(item), actHeadingOf(item)].join(' ').toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [history, searchTerm, kind]);

  const days = useMemo(() => {
    const buckets = new Map<string, { label: string; items: SearchHistoryItem[] }>();
    for (const item of filtered) {
      const d = item.created_at ? new Date(item.created_at) : null;
      const key = d ? dayKey(d) : '__nodate__';
      const bucket = buckets.get(key) ?? { label: d ? dayLabel(d) : 'Senza data', items: [] };
      bucket.items.push(item);
      buckets.set(key, bucket);
    }
    return Array.from(buckets.entries()).map(([key, value]) => ({ key, ...value }));
  }, [filtered]);

  const filtering = searchTerm.trim() !== '' || kind !== 'all';

  return (
    <PageFrame
      title="Cronologia"
      action={
        <div className="min-w-0 flex-1 md:w-64 md:flex-none">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Filtra…"
            aria-label="Cerca nella cronologia"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-keyshortcuts="/"
            title="Filtra (premi /)"
            icon={<Search size={16} aria-hidden />}
          />
        </div>
      }
    >
      <NormaChangesSection onOpen={(params) => { navigate('/'); triggerSearch(params); }} className="mb-10" />
      <SegmentedTabs tabs={KINDS} value={kind} onChange={setKind} label="Mostra" size="sm" className="mb-6 self-start" />
      <Arrive loading={loading} placeholder={<><p role="status" className="sr-only">Apro la cronologia…</p><HistoryListSkeleton /></>}>
        {history.length === 0 ? (
          <p className="border-t border-slate-200 pt-4 text-[15px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Le norme e le sentenze che apri compaiono qui.
          </p>
        ) : filtered.length === 0 ? (
          <p className="border-t border-slate-200 pt-4 text-[15px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Nessuna voce corrisponde{more ? ' tra quelle caricate' : ''}.{' '}
            <Button variant="link" onClick={() => { setSearchTerm(''); setKind('all'); }}>Azzera il filtro</Button>
          </p>
        ) : (
          <div className="space-y-8">
            {more && filtering && (
              <p className="text-sm text-slate-600 dark:text-slate-400">Il filtro guarda le voci caricate: per i giorni precedenti, «Mostra i giorni precedenti» in fondo.</p>
            )}
            {days.map(({ key, label, items }) => (
              <section key={key} aria-label={label} className="group/day">
                <div className="sticky top-[var(--phone-bar-offset,0px)] z-10 flex items-baseline justify-between gap-4 bg-slate-50 py-2 dark:bg-slate-950">
                  <h2 className="font-serif text-xl font-medium text-slate-900 first-letter:uppercase dark:text-slate-50">{label}</h2>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => remove(items, items.length === 1 ? `Tolta 1 voce di ${label.toLowerCase()}` : `Tolte ${items.length} voci di ${label.toLowerCase()}`)}
                    aria-label={`Togli il giorno: ${label}`}
                    className="text-sm md:opacity-0 md:focus-visible:opacity-100 md:group-hover/day:opacity-100"
                  >
                    Togli il giorno
                  </Button>
                </div>
                <ul className="border-b border-slate-200 dark:border-slate-800">
                  {items.map((item) => (
                    <HistoryRow
                      key={item.id}
                      item={item}
                      menuItems={menuItems(item)}
                      onOpen={() => open(item)}
                      onRemove={() => remove([item], 'Tolta dalla cronologia')}
                    >
                      {newDossierFor === item.id && (
                        <form
                          className="flex flex-wrap items-center gap-2 pb-3 pl-0 md:pl-28"
                          onSubmit={(e) => { e.preventDefault(); void createAndAdd(item); }}
                        >
                          <Input
                            type="text"
                            aria-label="Nome della nuova pratica"
                            placeholder="Nome della nuova pratica"
                            autoFocus
                            maxLength={120}
                            value={newDossierTitle}
                            onChange={(e) => setNewDossierTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setNewDossierFor(null); } }}
                            className="min-w-0 flex-1"
                          />
                          <Button type="submit" size="sm" disabled={!newDossierTitle.trim()}>Crea e aggiungi</Button>
                          <Button type="button" size="sm" variant="quiet" onClick={() => setNewDossierFor(null)}>Annulla</Button>
                        </form>
                      )}
                    </HistoryRow>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            {more ? (
              <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>Mostra i giorni precedenti</Button>
            ) : <span />}
            <Button variant="quiet" onClick={clearAll} className="text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
              Svuota la cronologia
            </Button>
          </div>
        )}
      </Arrive>

      {/* Feedback: the app's notifications (K1a). */}
      <Toast
        message={feedback?.message ?? ''}
        type={feedback?.type ?? 'success'}
        isVisible={feedback !== null}
        onClose={() => setFeedback(null)}
        duration={2000}
      />
    </PageFrame>
  );
}

/**
 * One row: the kind in words, the citation in serif with the act under it, the time, «⋯». The whole row is a button
 * that reopens it; Delete on it takes it off (behind «Annulla»). A decision key that no longer reads is «Sentenza»,
 * not clickable: there is nothing to open.
 */
function HistoryRow({ item, menuItems, onOpen, onRemove, children }: {
  item: SearchHistoryItem;
  menuItems: MenuItem[];
  onOpen: () => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const label = historyLabel(item);
  const heading = actHeadingOf(item);
  const readable = !item.decision_key || !!identityFromKey(item.decision_key);
  const body = (
    <>
      <span className="text-sm text-slate-600 md:w-24 md:shrink-0 dark:text-slate-400">{kindOf(item)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-[19px] text-slate-900 max-md:text-[17px] dark:text-slate-50">{label}</span>
        {heading && <span className="block truncate text-sm text-slate-600 dark:text-slate-400">{heading}</span>}
      </span>
      <span className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-slate-400" title={item.created_at ? new Date(item.created_at).toLocaleString('it-IT') : undefined}>
        {timeOf(item)}
      </span>
    </>
  );
  const rowLook = 'flex min-h-[44px] min-w-0 flex-1 gap-x-4 py-3 text-left max-md:flex-col max-md:py-2.5 md:items-center';
  return (
    <li data-history-row className="border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-900/60">
        {readable ? (
          // bare-button: a row of the list that is a whole entry, as the Scrivania's.
          <button
            type="button"
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemove(); } }}
            className={cn(rowLook, 'focus-visible:outline-none')}
          >
            {body}
          </button>
        ) : (
          <div className={rowLook}>{body}</div>
        )}
        <MenuButton
          label={`Altre azioni su ${label}`}
          title="Altre azioni"
          items={menuItems}
          placement="auto"
          menuClassName="max-h-80"
          triggerClassName="min-h-[44px] min-w-[44px] justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <MoreVertical size={18} aria-hidden />
        </MenuButton>
      </div>
      {children}
    </li>
  );
}
