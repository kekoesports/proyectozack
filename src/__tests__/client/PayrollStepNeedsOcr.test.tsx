/**
 * UI: el wizard de nóminas oculta el botón OCR cuando ocrEnabled=false.
 * Garantiza que en producción (con kill switch on) el usuario solo ve
 * el camino manual y no aparece ningún término técnico.
 */

// Mock de actions para evitar cargar la cadena server (auth → better-auth, etc.)
jest.mock('@/app/admin/(dashboard)/finanzas/nominas/importar/actions', () => ({
  parsePayrollPdfAction: jest.fn(),
  ocrPayrollPdfAction: jest.fn(),
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
};

describe('StepNeedsOcr — kill switch UI', () => {
  it('[5] ocrEnabled=false → NO renderiza botón OCR; muestra solo "Introducir manualmente"', () => {
    render(<StepNeedsOcr {...baseProps} ocrEnabled={false} />);
    expect(screen.queryByText(/Autocompletar con OCR/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Introducir manualmente/i)).toBeInTheDocument();
  });

  it('ocrEnabled=false → muestra copy explicativo de OCR deshabilitado', () => {
    render(<StepNeedsOcr {...baseProps} ocrEnabled={false} />);
    expect(
      screen.getByText(/OCR automático deshabilitado temporalmente/i),
    ).toBeInTheDocument();
  });

  it('ocrEnabled=true → renderiza ambos botones (OCR + Manual)', () => {
    render(<StepNeedsOcr {...baseProps} ocrEnabled={true} />);
    expect(screen.getByText(/Autocompletar con OCR/i)).toBeInTheDocument();
    expect(screen.getByText(/Introducir manualmente/i)).toBeInTheDocument();
  });

  it('[8] copy de UI no contiene términos técnicos (DOMMatrix, tesseract, pdf.worker, timeout)', () => {
    const { container } = render(<StepNeedsOcr {...baseProps} ocrEnabled={false} />);
    const text = (container.textContent ?? '').toLowerCase();
    for (const kw of ['dommatrix', 'tesseract', 'pdf.worker', 'cannot find module']) {
      expect(text).not.toContain(kw);
    }
  });

  it('error pasado por prop se renderiza pero sin filtrar términos técnicos', () => {
    render(
      <StepNeedsOcr
        {...baseProps}
        ocrEnabled={false}
        error="No se pudo leer el PDF automáticamente. Puedes introducir los datos manualmente."
      />,
    );
    expect(screen.getByText(/No se pudo leer el PDF automáticamente/i)).toBeInTheDocument();
    expect(screen.queryByText(/tesseract/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DOMMatrix/i)).not.toBeInTheDocument();
  });
});
