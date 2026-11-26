import { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { notificationService, type NormaChangeNotification } from '../../../services/notificationService';
import { NORMA_NOTIFICATIONS_CHANGED_EVENT } from '../../../hooks/useForumNotifications';
import { normaChangeLabel, normaFromChangeNotification } from '../../../utils/normaChanges';
import { searchParamsFromNorma } from '../dossier/dossierUtils';
import type { SearchParams } from '../../../types';

interface NormaChangesSectionProps {
  /** Reopens the norm on the reading surface: the caller navigates and triggers the search. */
  onOpen: (params: SearchParams) => void;
  /** Its place among the Scrivania's blocks. */
  className?: string;
}

/**
 * "Norme salvate aggiornate": the unread change notifications, on the
 * Scrivania (L-83). The avatar's badge and its menu entry count these rows; "Segna come lette" clears them
 * server-side and tells the badge's poller through a window event.
 * Renders nothing while loading and when there is nothing unread.
 */
export function NormaChangesSection({ onOpen, className }: NormaChangesSectionProps) {
  const [notifications, setNotifications] = useState<NormaChangeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    notificationService.getNormaChanges()
      .then(list => { if (!cancelled) setNotifications(list.filter(item => !item.readAt)); })
      .catch(err => {
        // Never hide a backend failure behind an empty section (gotcha 18).
        console.error('Failed to load norma change notifications:', err);
        if (!cancelled) setError('Impossibile caricare gli aggiornamenti delle norme salvate.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await notificationService.markNormaChangesRead();
      setNotifications([]);
      window.dispatchEvent(new Event(NORMA_NOTIFICATIONS_CHANGED_EVENT));
    } catch (err) {
      console.error('Failed to mark norma change notifications read:', err);
      setError('Impossibile segnare le notifiche come lette. Riprova.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return null;
  if (!error && notifications.length === 0) return null;

  return (
    <section aria-labelledby="norma-changes-title" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 max-md:mb-2">
        <h2 id="norma-changes-title" className="font-serif text-2xl font-medium text-slate-900 max-md:text-xl dark:text-slate-50">
          Norme salvate aggiornate
        </h2>
        {notifications.length > 0 && (
          <Button variant="quiet" onClick={() => void markAllRead()} loading={marking} icon={<Check size={14} aria-hidden />} className="gap-1.5 px-2 text-sm">
            Segna come lette
          </Button>
        )}
      </div>
      {error && <p role="alert" className="border-t border-slate-200 pt-4 text-sm text-red-600 dark:border-slate-800 dark:text-red-400">{error}</p>}
      {notifications.length > 0 && (
        <ul className="border-b border-slate-200 dark:border-slate-800">
          {notifications.map(item => {
            const norma = normaFromChangeNotification(item);
            return (
              <li key={item.id} className="flex min-h-[44px] items-center justify-between gap-4 border-t border-slate-200 py-3.5 max-md:py-2.5 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate font-serif text-[19px] text-slate-900 max-md:text-[17px] dark:text-slate-50">{normaChangeLabel(item)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Il testo è cambiato · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
                {norma && (
                  <Button variant="quiet" onClick={() => onOpen(searchParamsFromNorma(norma))} className="shrink-0">
                    Apri <ArrowRight size={16} aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
