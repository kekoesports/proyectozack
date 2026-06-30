/**
 * UI: el StepNeedsOcr del wizard de nóminas siempre ofrece OCR cliente.
 * Garantiza que:
 *   - aparece el botón "Autocompletar con OCR" siempre (OCR cliente always-on)
 *   - aparece el botón "Introducir manualmente" siempre
 *   - mientras isOcrPending=true, se muestra progreso (no botones)
 *   - el copy NO contiene tecnicismos (DOMMatrix, tesseract, pdf.worker, timeout)
 *   - el copy SÍ guía hacia entrada manual cuando hay error
 */

// Mock de actions para evitar cargar la cadena server (auth → better-auth, etc.)
jest.mock('@/app/admin/(dashboard)/finanzas/nominas/importar/actions', () => ({
  parsePayrollPdfAction: jest.fn(),
  applyPayrollImportAction: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import { StepNeedsOcr } from '@/features/admin/finance-payroll/PayrollImportWizard';

const baseProps = {
  file: new File(['x'], 'nomina.pdf'),
  fileName: 'nomina.pdf',
  pageCount: 2,
  onBack: jest.fn(),
  onOcr: jest.fn(),
  onManual: jest.fn(),
  isOcrPending: false,
  error: null,
  ocrProgress: null,
  ocrDebug: null,
};

describe('StepNeedsOcr — OCR cliente (always-on)', () => {
  it('[5/10] renderiza ambos botones: Autocompletar con OCR + Introducir manualmente', () => {
    render(<StepNeedsOcr {...baseProps} />);
    // El texto "Autocompletar con OCR" aparece también en el copy descriptivo.
    // Match exacto sobre el span del botón para distinguirlo.
    const ocrBtnLabel = screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === 'Autocompletar con OCR');
    expect(ocrBtnLabel).toBeInTheDocument();
    const manualBtnLabel = screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === 'Introducir manualmente');
    expect(manualBtnLabel).toBeInTheDocument();
  });

  it('muestra copy claro guiando a OCR o manual sin tecnicismos', () => {
    render(<StepNeedsOcr {...baseProps} />);
    expect(
      screen.getByText(/Puedes autocompletar con OCR en tu navegador o introducir los datos manualmente/i),
    ).toBeInTheDocument();
  });

  it('mientras isOcrPending=true, oculta los botones y muestra progreso', () => {
    render(
      <StepNeedsOcr
        {...baseProps}
        isOcrPending={true}
        ocrProgress={{ stage: 'recognize', page: 1, total: 2 }}
      />,
    );
    expect(screen.queryByText(/^Autocompletar con OCR$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Analizando el PDF en tu navegador/i)).toBeInTheDocument();
    expect(screen.getByText(/Leyendo texto 1\/2/i)).toBeInTheDocument();
  });

  it('progreso render se etiqueta como "Renderizando página X/Y"', () => {
    render(
      <StepNeedsOcr
        {...baseProps}
        isOcrPending={true}
        ocrProgress={{ stage: 'render', page: 2, total: 2 }}
      />,
    );
    expect(screen.getByText(/Renderizando página 2\/2/i)).toBeInTheDocument();
  });

  it('[11] error visible cae a fallback manual sin filtrar tecnicismos', () => {
    render(
      <StepNeedsOcr
        {...baseProps}
        error="No se pudo completar el OCR en tu navegador. Puedes introducir los datos manualmente."
      />,
    );
    expect(screen.getByText(/No se pudo completar el OCR en tu navegador/i)).toBeInTheDocument();
    expect(screen.queryByText(/tesseract/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DOMMatrix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pdf\.worker/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
  });

  it('copy de UI no contiene términos técnicos en ningún estado', () => {
    const { container } = render(<StepNeedsOcr {...baseProps} />);
    const text = (container.textContent ?? '').toLowerCase();
    for (const kw of ['dommatrix', 'tesseract', 'pdf.worker', 'cannot find module', 'timeout']) {
      expect(text).not.toContain(kw);
    }
  });

  it('cuando ocrDebug está presente, muestra bloque colapsable de soporte', () => {
    render(
      <StepNeedsOcr
        {...baseProps}
        error="No se pudo completar el OCR en tu navegador. Puedes introducir los datos manualmente."
        ocrDebug={{
          step: 'tesseract-create-worker',
          errorName: 'TypeError',
          errorMessage: 'Failed to load worker',
        }}
      />,
    );
    // El <details> está presente y contiene la información técnica
    expect(screen.getByText(/Detalles técnicos para soporte/i)).toBeInTheDocument();
    expect(screen.getByText(/step: tesseract-create-worker/)).toBeInTheDocument();
    expect(screen.getByText(/error: TypeError/)).toBeInTheDocument();
  });

  it('cuando ocrDebug es null, NO muestra el bloque de soporte', () => {
    render(<StepNeedsOcr {...baseProps} error="Error genérico" ocrDebug={null} />);
    expect(screen.queryByText(/Detalles técnicos para soporte/i)).not.toBeInTheDocument();
  });

  it('el bloque de soporte NO incluye nombres ni importes (solo step+error técnico)', () => {
    // Verificación defensiva: aunque ocrDebug recibiera PII (nunca debería pasar
    // porque runClientOcr nunca la pone), el componente solo renderiza step y
    // errorName/errorMessage. No accede a OCR text.
    const { container } = render(
      <StepNeedsOcr
        {...baseProps}
        error="generic"
        ocrDebug={{ step: 'recognize-start', errorName: 'AbortError', errorMessage: 'cancelled' }}
      />,
    );
    expect(container.textContent).not.toMatch(/ARIAS|PABLO|CAMACHO/i);
    expect(container.textContent).not.toMatch(/1\.000,00|1\.369,00|1\.696,55/);
  });
});
