export type ExtractedInvoiceData = {
  readonly type?: 'income' | 'expense';
  readonly concept?: string;
  readonly description?: string;
  readonly supplierName?: string;
  readonly customerName?: string;
  readonly taxId?: string;
  readonly invoiceNumber?: string;
  readonly issueDate?: string;   // YYYY-MM-DD
  readonly dueDate?: string;     // YYYY-MM-DD
  readonly netAmount?: number;
  readonly vatRate?: number;
  readonly withholdingRate?: number;
  readonly totalAmount?: number;
  readonly currency?: string;
  readonly paymentMethod?: string;
  readonly iban?: string;
  readonly confidence?: number;  // 0-1
};

export type ExtractionResult =
  | { readonly data: ExtractedInvoiceData; readonly error?: undefined }
  | { readonly data?: undefined; readonly error: string };
