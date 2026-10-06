/**
 * Types and schema definitions for the VINORA Data Import system.
 */

export type ImportEntityType = 'wines' | 'experiences' | 'events';

export interface CsvParsedRow {
  rowIndex: number; // 1-based index (data row number, excluding header)
  raw: Record<string, string>;
}

export interface CsvHeaderValidation {
  isValid: boolean;
  expectedHeaders: string[];
  presentHeaders: string[];
  missingRequiredHeaders: string[];
  unknownHeaders: string[];
}

export interface RowValidationError {
  field?: string;
  message: string;
}

export interface ValidatedRowPreview<T = Record<string, unknown>> {
  rowIndex: number;
  uniqueKey: string; // slug or unique identifier
  titleOrName: string;
  isExisting: boolean;
  isValid: boolean;
  errors: RowValidationError[];
  data: T | null;
  rawData: Record<string, string>;
}

export interface DataImportPreviewResponse {
  entityType: ImportEntityType;
  totalRows: number;
  newCount: number;
  existingCount: number;
  errorCount: number;
  canImport: boolean;
  headerValidation: CsvHeaderValidation;
  rows: ValidatedRowPreview[];
}

export interface DataImportExecuteResult {
  entityType: ImportEntityType;
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ rowIndex: number; uniqueKey?: string; message: string }>;
}
