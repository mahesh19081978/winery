'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Wine,
  Sparkles,
  Ticket,
  Check,
  XCircle,
} from 'lucide-react';
import { SectionCard } from '@/components/admin/UIComponents';
import {
  ImportEntityType,
  DataImportPreviewResponse,
  DataImportExecuteResult,
  ValidatedRowPreview,
} from '@/lib/data-import/types';

export function DataImportClient() {
  const [entityType, setEntityType] = useState<ImportEntityType>('wines');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Preview & validation state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<DataImportPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Execution state
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<DataImportExecuteResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleEntityChange = (type: ImportEntityType) => {
    if (type === entityType) return;
    setEntityType(type);
    // Reset file and preview if entity changes
    resetState();
  };

  const resetState = () => {
    setSelectedFile(null);
    setFileContent('');
    setPreviewData(null);
    setPreviewError(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPreviewError('Please upload a valid .csv file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPreviewError('File size exceeds the 5MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewError(null);
    setImportResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string) || '';
      setFileContent(content);
      await fetchPreview(entityType, content);
    };
    reader.onerror = () => {
      setPreviewError('Failed to read the selected file.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const fetchPreview = async (type: ImportEntityType, content: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const res = await fetch('/api/admin/data-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: type,
          csvContent: content,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setPreviewError(json.error || 'Failed to parse and validate CSV file.');
      } else {
        setPreviewData(json.data);
      }
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Network error during validation.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || !previewData.canImport || !fileContent) return;

    setImportLoading(true);
    setImportError(null);

    try {
      const res = await fetch('/api/admin/data-import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          csvContent: fileContent,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setImportError(json.error || 'Import failed. No changes were applied.');
      } else {
        setImportResult(json.data);
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Network error while executing import.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = `/api/admin/data-import/template?entity=${entityType}`;
    link.setAttribute('download', `vinora-${entityType}-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 tracking-tight">
            Data Import
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Batch import and synchronize Wines, Experiences, and Events using verified CSV templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            Download {entityType.charAt(0).toUpperCase() + entityType.slice(1, -1)} Template
          </button>
        </div>
      </div>

      {/* Entity Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-100/80 rounded-xl border border-stone-200/60 max-w-md">
        <button
          type="button"
          onClick={() => handleEntityChange('wines')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            entityType === 'wines'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Wine className="w-3.5 h-3.5 text-[#722F37]" />
          Wines
        </button>
        <button
          type="button"
          onClick={() => handleEntityChange('experiences')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            entityType === 'experiences'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Experiences
        </button>
        <button
          type="button"
          onClick={() => handleEntityChange('events')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            entityType === 'events'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Ticket className="w-3.5 h-3.5 text-emerald-600" />
          Events
        </button>
      </div>

      {/* Drag & Drop Upload Area */}
      <SectionCard title="Upload CSV File" description={`Select or drag a UTF-8 formatted CSV for ${entityType}.`}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-[#722F37] bg-[#722F37]/5 scale-[0.99]'
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 border border-stone-200">
              {previewLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#722F37]" />
              ) : (
                <UploadCloud className="w-6 h-6 text-[#722F37]" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-stone-800">
                {selectedFile ? (
                  <span className="font-semibold text-stone-900">{selectedFile.name}</span>
                ) : (
                  'Drag and drop your CSV file here, or click to browse'
                )}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Supports UTF-8 CSV with quotes up to 5MB (max 500 records per batch)
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={previewLoading || importLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                Choose File
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={resetState}
                  disabled={previewLoading || importLoading}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {previewError && (
          <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                Validation & Format Error
              </h4>
              <p className="text-xs text-rose-700 mt-1">{previewError}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Preview, Validation Summary & Actions */}
      {previewData && (
        <div className="space-y-6">
          {/* Header & Column Validation Check */}
          {!previewData.headerValidation.isValid && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Header Validation Issues Detected
                  </h4>
                  {previewData.headerValidation.missingRequiredHeaders.length > 0 && (
                    <p className="text-xs text-amber-800">
                      <strong>Missing required columns:</strong>{' '}
                      {previewData.headerValidation.missingRequiredHeaders.join(', ')}
                    </p>
                  )}
                  {previewData.headerValidation.unknownHeaders.length > 0 && (
                    <p className="text-xs text-amber-800">
                      <strong>Unknown columns (will not be silently ignored):</strong>{' '}
                      {previewData.headerValidation.unknownHeaders.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Counts & Action Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-2xs">
              <p className="text-[11px] font-semibold uppercase text-stone-500 tracking-wider">
                Total Rows
              </p>
              <p className="text-2xl font-serif font-medium text-stone-900 mt-1">
                {previewData.totalRows}
              </p>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
              <p className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider">
                New Records (Create)
              </p>
              <p className="text-2xl font-serif font-medium text-emerald-800 mt-1">
                {previewData.newCount}
              </p>
            </div>
            <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200/80 shadow-2xs">
              <p className="text-[11px] font-semibold uppercase text-sky-700 tracking-wider">
                Existing (Update)
              </p>
              <p className="text-2xl font-serif font-medium text-sky-800 mt-1">
                {previewData.existingCount}
              </p>
            </div>
            <div
              className={`p-4 rounded-xl border shadow-2xs ${
                previewData.errorCount > 0
                  ? 'bg-rose-50/70 border-rose-200/80'
                  : 'bg-stone-50 border-stone-200/80'
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  previewData.errorCount > 0 ? 'text-rose-700' : 'text-stone-500'
                }`}
              >
                Errors
              </p>
              <p
                className={`text-2xl font-serif font-medium mt-1 ${
                  previewData.errorCount > 0 ? 'text-rose-800' : 'text-stone-900'
                }`}
              >
                {previewData.errorCount}
              </p>
            </div>
          </div>

          {/* Import Execution Button & Warnings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <div>
              {previewData.canImport ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <Check className="w-4 h-4 text-emerald-600" />
                  All {previewData.totalRows} rows passed schema & header validation. Ready to import.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Import disabled: Please fix the {previewData.errorCount} row error(s) or header mismatches in your CSV.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!previewData.canImport || importLoading}
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                previewData.canImport && !importLoading
                  ? 'bg-[#722F37] hover:bg-[#5a242b] text-white'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Transactionally...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Import {previewData.totalRows} Records
                </>
              )}
            </button>
          </div>

          {/* Import Result Notification */}
          {importResult && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Import Completed Successfully!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Processed {importResult.totalProcessed} records transactionally:
                  </p>
                  <ul className="text-xs text-emerald-800 mt-2 list-disc list-inside space-y-0.5 font-medium">
                    <li>Created: {importResult.createdCount} new records</li>
                    <li>Updated: {importResult.updatedCount} existing records</li>
                    <li>Skipped: {importResult.skippedCount}</li>
                    <li>Failed: {importResult.failedCount}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {importError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Import Transaction Aborted
                </h4>
                <p className="text-xs text-rose-700 mt-1">{importError}</p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <SectionCard
            title="Records Preview"
            description={`Showing parsed rows and validation status (${previewData.rows.length} total)`}
          >
            <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-[500px]">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-100/80 sticky top-0 border-b border-stone-200 text-stone-900 font-semibold z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-14">#</th>
                    <th className="py-2.5 px-3">Unique Key / Slug</th>
                    <th className="py-2.5 px-3">Name / Title</th>
                    <th className="py-2.5 px-3 w-28">Status</th>
                    <th className="py-2.5 px-3">Validation & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {previewData.rows.map((row: ValidatedRowPreview) => (
                    <tr
                      key={row.rowIndex}
                      className={row.isValid ? 'hover:bg-stone-50/50' : 'bg-rose-50/40'}
                    >
                      <td className="py-2 px-3 font-mono text-stone-400 text-[11px]">
                        {row.rowIndex}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-stone-800">
                        {row.uniqueKey}
                      </td>
                      <td className="py-2 px-3 font-medium text-stone-900">
                        {row.titleOrName}
                      </td>
                      <td className="py-2 px-3">
                        {!row.isValid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            Error
                          </span>
                        ) : row.isExisting ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-sky-100 text-sky-800 border border-sky-200">
                            Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Create
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {row.errors.length > 0 ? (
                          <div className="space-y-1">
                            {row.errors.map((err, idx) => (
                              <p key={idx} className="text-[11px] text-rose-600 flex items-center gap-1">
                                <span className="font-semibold text-rose-700">
                                  {err.field ? `[${err.field}]:` : '•'}
                                </span>{' '}
                                {err.message}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400">Valid record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
