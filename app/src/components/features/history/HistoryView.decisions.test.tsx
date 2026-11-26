import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const getHistory = vi.fn();
const deleteHistoryItem = vi.fn();
const clearHistory = vi.fn();
vi.mock('../../../services/historyService', () => ({
  getHistory: (...a: unknown[]) => getHistory(...a),
  deleteHistoryItem: (...a: unknown[]) => deleteHistoryItem(...a),
  clearHistory: (...a: unknown[]) => clearHistory(...a),
}));

import { appStore } from '../../../store/useAppStore';
import { registerUndoToastListener, type UndoToast } from '../../../hooks/useUndoableAction';
import { HistoryView } from './HistoryView';

const at = '2026-10-10T10:00:00.000Z';
const norm = { id: 'n1', act_type: 'legge', decision_key: null, act_number: '241', article: '3', date: '1990', created_at: at };
const decision = { id: 'd1', act_type: null, decision_key: 'cassazione:civile:99999:2024', created_at: at };
const broken = { id: 'd2', act_type: null, decision_key: 'cassazione:civile:zero:2024', created_at: at };

function Where() { return <span data-testid="where">{useLocation().pathname}</span>; }
function mount() {
  return render(<MemoryRouter initialEntries={['/history']}><HistoryView /><Where /></MemoryRouter>);
}
const rowButton = (name: string) => screen.getAllByRole('button', { name: (n) => n.includes(name) && !n.startsWith('Altre azioni') && !n.startsWith('Togli') })[0];

let toast: UndoToast | null = null;
let stopListening = () => {};

beforeEach(() => {
  getHistory.mockReset();
  deleteHistoryItem.mockReset().mockResolvedValue(undefined);
  clearHistory.mockReset().mockResolvedValue(undefined);
  appStore.setState({ practices: [], activePracticeId: null, phoneReader: null });
  toast = null;
  stopListening = registerUndoToastListener((t) => { toast = t; });
});
afterEach(() => {
  act(() => toast?.onDismiss());
  stopListening();
});

describe('HistoryView (L-82, L-84)', () => {
  it('opens a decision at once in the workspace, with no preview', async () => {
    getHistory.mockResolvedValue([decision]);
    mount();
    await screen.findAllByText('Cass. civ., n. 99999/2024');
    fireEvent.click(rowButton('Cass. civ., n. 99999/2024'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(appStore.getState().practices.flatMap((p) => p.decisions.map((d) => d.reference))).toEqual([
      { corte: 'cassazione', archivio: 'civile', numero: 99999, anno: 2024 },
    ]);
    expect(screen.getByTestId('where').textContent).toBe('/');
  });

  it('names the page with one h1, one filter of 16 px on a phone, and the three kinds', async () => {
    getHistory.mockResolvedValue([norm]);
    mount();
    await screen.findAllByText('art. 3 l. 241/1990');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent?.trim())).toEqual(['Cronologia']);
    expect(screen.getByRole('textbox', { name: 'Cerca nella cronologia' })).toHaveClass('text-[length:max(1rem,16px)]', 'md:text-sm');
    expect(screen.getAllByRole('radio').map((t) => t.textContent)).toEqual(['Tutto', 'Norme', 'Sentenze']);
  });

  it('holds the rows\' place while the history is read', async () => {
    let read: (rows: unknown[]) => void = () => {};
    getHistory.mockReturnValue(new Promise((resolve) => { read = resolve; }));
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Apro la cronologia…');
    expect(document.querySelectorAll('[data-skeleton-row]').length).toBeGreaterThan(0);
    await act(async () => { read([norm]); });
    expect(document.querySelector('[data-skeleton-row]')).toBeNull();
  });

  it('writes a row as the kind in words, the norm as it is cited, the act under it and the time; one list, no cards', async () => {
    getHistory.mockResolvedValue([norm, decision]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    expect(screen.getByText('l. n. 241 del 1990')).toBeInTheDocument();
    expect(screen.getByText('Norma')).toBeInTheDocument();
    expect(screen.getAllByText('Sentenza').length).toBeGreaterThan(0);
    expect(screen.getAllByText(new Date(at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }))).toHaveLength(2);
    expect(document.querySelectorAll('[data-history-row]')).toHaveLength(2);
    expect(screen.queryByText(/fa$/)).toBeNull();
  });

  it('filters by kind', async () => {
    getHistory.mockResolvedValue([norm, decision]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.click(screen.getByRole('radio', { name: 'Sentenze' }));
    expect(screen.queryByText('art. 3 l. 241/1990')).toBeNull();
    expect(screen.getByText('Cass. civ., n. 99999/2024')).toBeInTheDocument();
  });

  it('writes a list of articles as «artt.», comma by comma', async () => {
    getHistory.mockResolvedValue([{ ...norm, act_type: 'codice civile', act_number: null, date: null, article: '2056,2057' }]);
    mount();
    expect(await screen.findByText('artt. 2056, 2057 c.c.')).toBeInTheDocument();
  });

  it('reopens a norm in the version it was read in', async () => {
    getHistory.mockResolvedValue([{ ...norm, version: 'originale' }]);
    const triggerSearch = vi.fn();
    appStore.setState({ triggerSearch } as never);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.click(rowButton('art. 3 l. 241/1990'));
    expect(triggerSearch).toHaveBeenCalledWith(expect.objectContaining({ act_type: 'legge', article: '3', version: 'originale' }));
  });

  it('shows an unreadable key as «Sentenza», not clickable, and logs it once', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    getHistory.mockResolvedValue([broken]);
    mount();
    expect((await screen.findAllByText('Sentenza')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Sentenza/ })).toBeNull();
    expect(error.mock.calls.filter((c) => c[0] === 'history: unreadable decision key')).toHaveLength(1);
    error.mockRestore();
  });

  it('lists a norm\'s actions in its «⋯»', async () => {
    getHistory.mockResolvedValue([norm]);
    appStore.setState({ dossiers: [{ id: 'p1', title: 'Pratica Rossi' }] } as never);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Altre azioni su art. 3 l. 241/1990' }));
    expect(within(screen.getByRole('menu')).getAllByRole('menuitem').map((i) => i.getAttribute('aria-label') ?? i.textContent)).toEqual([
      'Aggiungi alle ricerche frequenti', 'Aggiungi a Pratica Rossi', 'Aggiungi a una nuova pratica…', 'Togli dalla cronologia',
    ]);
  });

  it('asks a new practice\'s title under the row, not in a window', async () => {
    getHistory.mockResolvedValue([norm]);
    appStore.setState({ dossiers: [] } as never);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Altre azioni su art. 3 l. 241/1990' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Aggiungi a una nuova pratica…' }));
    const field = screen.getByRole('textbox', { name: 'Nome della nuova pratica' });
    expect(field.closest('[data-history-row]')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('takes a row off at once and sends the removal only when «Annulla» is gone (L-84)', async () => {
    getHistory.mockResolvedValue([norm, decision]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.click(screen.getByRole('button', { name: 'Altre azioni su art. 3 l. 241/1990' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Togli dalla cronologia' }));
    expect(screen.queryByText('art. 3 l. 241/1990')).toBeNull();
    expect(toast?.message).toBe('Tolta dalla cronologia');
    expect(deleteHistoryItem).not.toHaveBeenCalled();
    act(() => toast?.onDismiss());
    await waitFor(() => expect(deleteHistoryItem).toHaveBeenCalledWith('n1'));
  });

  it('puts a row back on «Annulla» and sends nothing', async () => {
    getHistory.mockResolvedValue([norm]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.keyDown(rowButton('art. 3 l. 241/1990'), { key: 'Delete' });
    expect(screen.queryByText('art. 3 l. 241/1990')).toBeNull();
    await act(async () => { await toast?.onUndo(); });
    expect(await screen.findByText('art. 3 l. 241/1990')).toBeInTheDocument();
    expect(deleteHistoryItem).not.toHaveBeenCalled();
  });

  it('takes a whole day off behind one «Annulla»', async () => {
    getHistory.mockResolvedValue([norm, decision]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.click(screen.getByRole('button', { name: /^Togli il giorno/ }));
    expect(document.querySelectorAll('[data-history-row]')).toHaveLength(0);
    expect(toast?.message).toMatch(/^Tolte 2 voci di /);
    act(() => toast?.onDismiss());
    await waitFor(() => expect(deleteHistoryItem).toHaveBeenCalledTimes(2));
  });

  it('empties the history with no question before, behind «Annulla», with one request', async () => {
    getHistory.mockResolvedValue([norm]);
    mount();
    await screen.findByText('art. 3 l. 241/1990');
    fireEvent.click(screen.getByRole('button', { name: 'Svuota la cronologia' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Le norme e le sentenze che apri compaiono qui.')).toBeInTheDocument();
    expect(toast?.message).toBe('Cronologia svuotata');
    act(() => toast?.onDismiss());
    await waitFor(() => expect(clearHistory).toHaveBeenCalledTimes(1));
  });
});
