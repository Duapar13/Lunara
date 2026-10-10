import { ConsultationList } from '@/components/ConsultationList';
import { t } from '@/lib/i18n';

export default function ReaderConsultations() {
  return <ConsultationList viewer="reader" title={t('Consultas')} />;
}
