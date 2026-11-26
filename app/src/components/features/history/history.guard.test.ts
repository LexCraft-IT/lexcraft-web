import { guardCommonControls } from '../../../test/commonControlsGuard';

// LC117: Cronologia speaks the common components' language, as Pratiche (LC106), Opus (LC110), Learn (LC112), the reader
// (LC113), the Forum (LC114) and Impostazioni (LC115).
guardCommonControls({
  name: 'Cronologia',
  dir: 'components/features/history',
  expected: ['HistoryView.tsx', 'NormaChangesSection.tsx', 'RecentHistory.tsx', 'historyRows.ts'],
  // L-87: no window left — the clearing has «Annulla» (L-84), «Nuova pratica» asks its title under the row.
  localLooks: ['FIELD', 'ACTION', 'LINK', 'ICON_BUTTON'],
});
