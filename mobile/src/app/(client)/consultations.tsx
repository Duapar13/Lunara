import { ConsultationList } from '@/components/ConsultationList';
import { t } from '@/lib/i18n';

export default function MyConsultations() {
  return <ConsultationList viewer="client" title={t('Mis consultas')} />;
}
