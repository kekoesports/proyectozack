import { redirect } from 'next/navigation';

// Redirige permanentemente a la nueva sección financiera unificada
export default function AdminGastosPage(): never {
  redirect('/admin/finanzas/gastos-operativos');
}
