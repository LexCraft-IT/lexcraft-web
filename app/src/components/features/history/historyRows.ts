/**
 * What the Cronologia's page and the Scrivania's «Letto di recente» share: how a row is named and reopened, and the
 * removals behind «Annulla» (L-84: held in the browser and sent when the notification closes, `deferredRemovals.ts`;
 * no bin on the server).
 */
import type { SearchParams } from '../../../types';
import { actHeading, labelFromParams } from '../../../utils/sources';
import { decisionHistoryLabel } from '../../../utils/decisionLinks';
import { clearHistory, deleteHistoryItem, type SearchHistoryItem } from '../../../services/historyService';
import { isRemovalPending, removeManyWithUndo, type RemovalTarget } from '../../../store/deferredRemovals';

/** Told on `window` when «Annulla» puts rows back, with them: a page mounted since puts them back too. */
export const HISTORY_PUT_BACK_EVENT = 'lexcraft:history-put-back';

/** The whole history being cleared, behind its «Annulla». */
const ALL = 'history:*';
const keyOf = (id: string) => `history:${id}`;

/** A row the user removed and whose «Annulla» is still on screen (or whose removal is not answered yet): not drawn. */
export const isRowShown = (item: SearchHistoryItem) => !isRemovalPending(ALL) && !isRemovalPending(keyOf(item.id));

// «2056,2057,2058» as the server keeps it, read as «2056, 2057, 2058» (B8).
const articlesOf = (item: SearchHistoryItem) => item.article?.toString().split(',').map((a) => a.trim()).filter(Boolean).join(', ') ?? '';

/** The row's title: the norm as it is cited, «art. 2043 c.c.», «artt. 2056, 2057 c.c.» (B8); a decision's short citation. */
export function historyLabel(item: SearchHistoryItem): string {
  if (item.decision_key) return decisionHistoryLabel(item.decision_key);
  const articles = articlesOf(item);
  const label = labelFromParams({ act_type: item.act_type ?? '', act_number: item.act_number, date: item.date, article: articles });
  return articles.includes(',') ? label.replace(/^art\. /, 'artt. ') : label;
}

/** The act by its name («Codice civile») under a norm; nothing under a decision. */
export const actHeadingOf = (item: SearchHistoryItem) =>
  item.decision_key ? '' : actHeading({ tipo_atto: item.act_type ?? '', numero_atto: item.act_number, data: item.date });

export const kindOf = (item: SearchHistoryItem) => (item.decision_key ? 'Sentenza' : 'Norma');

/** «14:32», in Rome's time as the day headings. */
export const timeOf = (item: SearchHistoryItem) =>
  item.created_at ? new Date(item.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : '';

/** The search the row was, with the version it was read in (the proposal of 18 Nov, §3.1), not always the one in force. */
export function searchParamsOf(item: SearchHistoryItem): SearchParams {
  return {
    act_type: item.act_type ?? '',
    act_number: item.act_number || '',
    date: item.date || '',
    article: item.article?.toString() || '',
    version: item.version === 'originale' ? 'originale' : 'vigente',
    version_date: '',
  };
}

const putBack = (items: SearchHistoryItem[]) => window.dispatchEvent(new CustomEvent(HISTORY_PUT_BACK_EVENT, { detail: items }));

/**
 * Rows taken off the screen by the caller, removed behind «Annulla»: the `DELETE`s go when the notification closes, or
 * as the page goes (`keepalive`). A page closed and its tab lost before that may leave them on the server: they come
 * back at the next reading, the lesser harm for a personal datum.
 */
export function removeRowsWithUndo(items: SearchHistoryItem[], message: string, onRefused: () => void) {
  removeManyWithUndo<SearchHistoryItem>({
    message,
    targets: items.map((item): RemovalTarget<SearchHistoryItem> => ({
      key: keyOf(item.id),
      path: `/history/${encodeURIComponent(item.id)}`,
      remove: () => deleteHistoryItem(item.id),
      item,
    })),
    putBack: (item) => putBack([item]),
    onRefused,
  });
}

/** The whole history, the rows not loaded too, removed behind «Annulla» with one `DELETE /history`. */
export function clearAllWithUndo(loaded: SearchHistoryItem[], onRefused: () => void) {
  removeManyWithUndo<SearchHistoryItem[]>({
    message: 'Cronologia svuotata',
    targets: [{ key: ALL, path: '/history', remove: clearHistory, item: loaded }],
    putBack,
    onRefused,
  });
}
