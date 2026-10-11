import { Icon } from './Icon';
import { STATUS_LABEL, type LotStatus } from '../services/lots';

const ICON = { curso: 'clock', conf: 'check', no: 'x', rec: 'bagS' } as const;

/** Estado siempre con icono + texto, nunca solo color. */
export function StatusPill({ status, label, size = 18 }: { status: LotStatus; label?: string; size?: number }) {
  return (
    <span className={`s s-${status}`} style={{ alignSelf: 'flex-start' }}>
      <Icon name={ICON[status]} size={size} stroke={status === 'conf' || status === 'no' ? 2.8 : 2.2} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
