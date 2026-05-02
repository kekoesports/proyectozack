import { notFound } from 'next/navigation';
import { getSignerByToken } from '@/lib/queries/contracts';
import { SignatureForm } from './SignatureForm';

export const metadata = { title: 'Firmar contrato — SocialPro' };

export default async function SignPage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  const data = await getSignerByToken(token);

  if (!data) notFound();

  const alreadySigned = data.status === 'signed';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="h-1.5" style={{ background: 'linear-gradient(135deg,#f5632a,#8b3aad)' }} />
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg,#f5632a,#8b3aad)' }}>SP</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">SocialPro Agency</p>
              <p className="text-base font-bold text-gray-900">Firma de contrato</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Info firmante */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Firmante</p>
            <p className="text-base font-semibold text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-500">{data.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
              {data.role === 'brand' ? 'Marca' : data.role === 'influencer' ? 'Influencer' : 'Agencia'}
            </span>
          </div>

          {/* Documento */}
          {data.contract.fileUrl && (
            <div className="rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Contrato</p>
                <p className="text-sm font-medium text-gray-900">{data.contract.fileName ?? 'Contrato.pdf'}</p>
              </div>
              <a href={data.contract.fileUrl} target="_blank" rel="noreferrer"
                className="text-sm font-bold text-orange-500 hover:text-orange-600 underline">
                Ver PDF →
              </a>
            </div>
          )}

          {alreadySigned && data.signedAt ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-5 text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="font-bold text-emerald-800">Contrato firmado</p>
              <p className="text-sm text-emerald-600 mt-1">
                Firmado el {new Date(data.signedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <SignatureForm token={token} signerName={data.name} />
          )}
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Al firmar, confirmás que has leído y aceptas el contrato.
            Queda registrado tu nombre, fecha y dirección IP.
          </p>
        </div>
      </div>
    </div>
  );
}
