'use client';
import { useState } from 'react';
import { FileText, Layers, CircleCheck } from 'lucide-react';
export function StudioWorkbench({ script, montage, review, chat }: { script: React.ReactNode; montage: React.ReactNode; review: React.ReactNode; chat: React.ReactNode }) {
  const [step, setStep] = useState<'script' | 'montage' | 'review'>('montage');
  const steps = [{ id: 'script', label: '01 · Brief y guion', icon: FileText }, { id: 'montage', label: '02 · Montaje', icon: Layers }, { id: 'review', label: '03 · Revisión', icon: CircleCheck }] as const;
  return <div className="studio-workbench"><div className="studio-workbench-main"><nav className="studio-steps" aria-label="Pasos de producción">{steps.map(({ id, label, icon: Icon }) => <button key={id} aria-current={step === id ? 'step' : undefined} onClick={() => setStep(id)}><Icon size={17} />{label}</button>)}</nav>
    <div hidden={step !== 'script'}>{script}</div><div hidden={step !== 'montage'}>{montage}</div><div hidden={step !== 'review'}>{review}</div>
  </div>{chat}</div>;
}
