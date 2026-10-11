import { useStore, type FontSize } from '../state/store';
import styles from './Layout.module.css';

const SIZES: { v: FontSize; label: string; aria: string; px: number }[] = [
  { v: 18, label: 'A', aria: 'A, texto normal', px: 16 },
  { v: 21, label: 'A+', aria: 'A+, texto grande', px: 20 },
  { v: 24, label: 'A++', aria: 'A++, texto muy grande', px: 24 },
];

export function FontSizeControl({ label = 'Tamaño del texto:' }: { label?: string }) {
  const { state, dispatch } = useStore();
  return (
    <div role="group" aria-label="Tamaño del texto" className={styles.fsRow}>
      <span>{label}</span>
      {SIZES.map((s) => (
        <button key={s.v} type="button" className={styles.fsb} style={{ fontSize: s.px }} aria-label={s.aria}
          aria-pressed={state.fontSize === s.v} onClick={() => dispatch({ type: 'fontSize', size: s.v })}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
