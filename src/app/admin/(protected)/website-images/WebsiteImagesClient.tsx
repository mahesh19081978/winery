'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  LayoutGrid,
  Check,
  Sparkles,
} from 'lucide-react';
import { StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { ImageUploadField, type UploadedImageResult } from '@/components/admin/ImageUploadField';
import { ImageCropEditor } from '@/components/admin/ImageCropEditor';
import { useIsMounted } from '@/hooks/useIsMounted';
import type { WebsiteImageAdminRecord, CropMetadata } from '@/lib/website-images';

interface WebsiteImageDraft {
  url: string | null;
  originalUrl: string | null;
  cropData: CropMetadata | null;
  altText: string;
  upload: {
    width: number | null;
    height: number | null;
    mime: string | null;
    filename: string;
  } | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function buildDrafts(records: WebsiteImageAdminRecord[]): Record<string, WebsiteImageDraft> {
  const drafts: Record<string, WebsiteImageDraft> = {};
  for (const record of records) {
    drafts[record.key] = {
      url: record.url,
      originalUrl: record.originalUrl ?? record.url,
      cropData: record.cropData ?? null,
      altText: record.altText ?? record.defaultAlt,
      upload: null,
    };
  }
  return drafts;
}

function savedAltOf(record: WebsiteImageAdminRecord): string {
  return record.altText ?? record.defaultAlt;
}

export function WebsiteImagesClient({
  initialRecords = [],
}: {
  initialRecords?: WebsiteImageAdminRecord[];
}) {
  const mounted = useIsMounted();
  const [images, setImages] = useState<WebsiteImageAdminRecord[]>(initialRecords);
  const [drafts, setDrafts] = useState<Record<string, WebsiteImageDraft>>(() => buildDrafts(initialRecords));
  const [loading, setLoading] = useState(initialRecords.length === 0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [activeCrop, setActiveCrop] = useState<{
    key: import('@/lib/website-images').WebsiteImageKey;
    sourceUrl: string;
    cropMetadata?: CropMetadata | null;
  } | null>(null);

  const fetchRecords = useCallback(async (): Promise<WebsiteImageAdminRecord[]> => {
    const res = await fetch('/api/admin/website-images');
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load website images');
    return (json.data.images as WebsiteImageAdminRecord[]) || [];
  }, []);

  const loadRecords = useCallback(async () => {
    const records = await fetchRecords();
    setImages(records);
    setDrafts(buildDrafts(records));
    setSaveStates({});
  }, [fetchRecords]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching website images');
    } finally {
      setLoading(false);
    }
  }, [loadRecords]);

  useEffect(() => {
    if (initialRecords.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const records = await fetchRecords();
        if (cancelled) return;
        setImages(records);
        setDrafts(buildDrafts(records));
        setSaveStates({});
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching website images');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRecords, initialRecords.length]);

  const isDirty = useCallback((record: WebsiteImageAdminRecord): boolean => {
    const draft = drafts[record.key];
    if (!draft) return false;
    return draft.url !== record.url || draft.altText !== savedAltOf(record);
  }, [drafts]);

  const dirtyCount = useMemo(
    () => images.filter((record) => isDirty(record)).length,
    [images, isDirty]
  );

  const customCount = images.filter((record) => record.isCustomized).length;

  const filteredImages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return images;
    return images.filter(
      (record) =>
        record.key.toLowerCase().includes(term) ||
        record.label.toLowerCase().includes(term) ||
        record.group.toLowerCase().includes(term)
    );
  }, [images, search]);

  const groupedImages = useMemo(() => {
    const map = new Map<string, WebsiteImageAdminRecord[]>();
    for (const record of filteredImages) {
      const bucket = map.get(record.group);
      if (bucket) bucket.push(record);
      else map.set(record.group, [record]);
    }
    return Array.from(map.entries());
  }, [filteredImages]);

  const updateDraft = (key: string, patch: Partial<WebsiteImageDraft>) => {
    setDrafts((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return { ...prev, [key]: { ...current, ...patch, upload: patch.upload !== undefined ? patch.upload : current.upload } };
    });
    setSaveStates((prev) => (prev[key] === 'saved' ? { ...prev, [key]: 'idle' } : prev));
  };

  const handleUpload = async (key: import('@/lib/website-images').WebsiteImageKey, result: UploadedImageResult) => {
    setUploadingKey(key);
    try {
      // Upon new upload, immediately open crop modal so user can position before final save
      setActiveCrop({
        key,
        sourceUrl: result.url,
        cropMetadata: null,
      });
      // Store original upload url in draft
      updateDraft(key, {
        originalUrl: result.url,
        upload: {
          width: result.width,
          height: result.height,
          mime: result.mime,
          filename: result.filename,
        },
      });
    } finally {
      setUploadingKey(null);
    }
  };

  const handleOpenCropper = (record: WebsiteImageAdminRecord) => {
    const draft = drafts[record.key];
    // Source for cropping is original uploaded image if present, or custom/resolved URL
    const sourceUrl = draft?.originalUrl || record.originalUrl || draft?.url || record.resolvedUrl;
    setActiveCrop({
      key: record.key,
      sourceUrl,
      cropMetadata: draft?.cropData ?? record.cropData ?? null,
    });
  };

  const handleCropApplied = (cropResult: {
    croppedUrl: string;
    cropMetadata: CropMetadata;
    originalUrl: string;
    width: number;
    height: number;
    mime: string;
    filename: string;
  }) => {
    if (!activeCrop) return;
    const { key } = activeCrop;

    updateDraft(key, {
      url: cropResult.croppedUrl,
      originalUrl: cropResult.originalUrl,
      cropData: cropResult.cropMetadata,
      upload: {
        width: cropResult.width,
        height: cropResult.height,
        mime: cropResult.mime,
        filename: cropResult.filename,
      },
    });

    setActiveCrop(null);
  };

  const handleSave = async (record: WebsiteImageAdminRecord) => {
    const draft = drafts[record.key];
    if (!draft) return;

    setSaveStates((prev) => ({ ...prev, [record.key]: 'saving' }));
    setError('');

    try {
      const body: Record<string, unknown> = { key: record.key, altText: draft.altText.trim() };
      if (draft.url !== record.url && draft.url) {
        body.url = draft.url;
        body.originalUrl = draft.originalUrl ?? record.originalUrl ?? draft.url;
        body.cropData = draft.cropData ?? record.cropData ?? null;
        body.width = draft.upload?.width ?? null;
        body.height = draft.upload?.height ?? null;
        body.mime = draft.upload?.mime ?? null;
        body.filename = draft.upload?.filename ?? null;
      }

      const res = await fetch('/api/admin/website-images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save image');

      const updated: WebsiteImageAdminRecord = json.data.image;
      setImages((prev) => prev.map((item) => (item.key === updated.key ? updated : item)));
      setDrafts((prev) => ({
        ...prev,
        [updated.key]: {
          url: updated.url,
          originalUrl: updated.originalUrl ?? updated.url,
          cropData: updated.cropData ?? null,
          altText: updated.altText ?? updated.defaultAlt,
          upload: null,
        },
      }));
      setSaveStates((prev) => ({ ...prev, [updated.key]: 'saved' }));
      setSuccessMsg(`${updated.group} · ${updated.label} saved and public cache refreshed`);
    } catch (err) {
      setSaveStates((prev) => ({ ...prev, [record.key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save image');
    }
  };

  const handleReset = async (record: WebsiteImageAdminRecord) => {
    const confirmed = window.confirm(
      `Reset "${record.group} · ${record.label}" back to its default image? The custom image will be removed from the public website.`
    );
    if (!confirmed) return;

    setResettingKey(record.key);
    setError('');
    try {
      const res = await fetch(`/api/admin/website-images/${encodeURIComponent(record.key)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to reset image');

      const updated: WebsiteImageAdminRecord = json.data.image;
      setImages((prev) => prev.map((item) => (item.key === updated.key ? updated : item)));
      setDrafts((prev) => ({
        ...prev,
        [updated.key]: {
          url: updated.url,
          originalUrl: updated.originalUrl ?? updated.url,
          cropData: updated.cropData ?? null,
          altText: updated.altText ?? updated.defaultAlt,
          upload: null,
        },
      }));
      setSaveStates((prev) => ({ ...prev, [updated.key]: 'idle' }));
      setSuccessMsg(`${updated.group} · ${updated.label} reset to default`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset image');
    } finally {
      setResettingKey(null);
    }
  };

  const renderSaveState = (record: WebsiteImageAdminRecord) => {
    const state = saveStates[record.key];
    if (state === 'saving') return <span className="text-stone-500">Saving...</span>;
    if (state === 'error') return <span className="text-rose-600">Save failed</span>;
    if (isDirty(record)) return <span className="text-amber-600 font-medium">Unsaved changes</span>;
    if (state === 'saved') return <span className="text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>;
    return <span className="text-stone-400">No changes</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-medium text-stone-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#6c2432]" />
            Website Images
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Hero and marketing imagery used across the public website — replace without code changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Website</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {dirtyCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {dirtyCount} image {dirtyCount === 1 ? 'has' : 'have'} unsaved changes. Press Save on each card to publish
            them to the public website.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Image Slots"
          value={images.length}
          subtitle="Configurable marketing images"
          icon={ImageIcon}
        />
        <StatCard
          title="Customized"
          value={customCount}
          subtitle="Replaced by admin upload"
          icon={Sparkles}
        />
        <StatCard
          title="Using Defaults"
          value={Math.max(images.length - customCount, 0)}
          subtitle="Bundled public/images assets"
          icon={LayoutGrid}
        />
        <StatCard
          title="Unsaved Changes"
          value={dirtyCount}
          subtitle={dirtyCount > 0 ? 'Save to publish' : 'All changes saved'}
          icon={Check}
        />
      </div>

      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by page, section, or image key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
          <span className="text-xs">Loading website images...</span>
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-7 h-7" />}
          title="No image slots found"
          description={search ? 'No page or section matches your search term.' : 'No configurable images are registered.'}
        />
      ) : (
        <div className="space-y-8">
          {groupedImages.map(([group, records]) => (
            <div key={group} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-base font-medium text-stone-900">{group}</h2>
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                  {records.length} slot{records.length === 1 ? '' : 's'}
                  {records[0]?.routes?.[0] && (
                    <a
                      href={records[0].routes[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-[#8a3243] hover:underline normal-case"
                    >
                      {records[0].routes[0]}
                    </a>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {records.map((record) => {
                  const draft = drafts[record.key];
                  if (!draft) return null;
                  const dirty = isDirty(record);
                  const saving = saveStates[record.key] === 'saving';
                  const resetting = resettingKey === record.key;
                  const uploading = uploadingKey === record.key;
                  const canReset = record.isCustomized || record.altText !== null || dirty;
                  const previewUrl = draft.url ?? record.resolvedUrl;

                  return (
                    <div
                      key={record.key}
                      data-website-image-key={record.key}
                      className={`bg-white rounded-xl border shadow-xs overflow-hidden flex flex-col ${
                        dirty ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-stone-200/80'
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-serif font-medium text-sm text-stone-900 leading-snug truncate">
                              {record.label}
                            </h3>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
                              {record.key}
                            </span>
                          </div>
                          <StatusBadge
                            status={record.isCustomized ? 'Custom' : 'Default'}
                            variant={record.isCustomized ? 'success' : 'default'}
                            size="sm"
                          />
                        </div>

                        <ImageUploadField
                          previewUrl={previewUrl}
                          previewAlt={draft.altText}
                          onUpload={(result) => handleUpload(record.key, result)}
                          onRemove={canReset ? () => handleReset(record) : undefined}
                          onCropClick={() => handleOpenCropper(record)}
                          cropLabel={record.cropData ? 'Re-edit Crop' : 'Crop Image'}
                          uploading={uploading}
                          disabled={saving || resetting}
                          removeLabel={resetting ? 'Resetting...' : 'Reset to Default'}
                          uploadLabel={record.isCustomized ? 'Replace Image' : 'Upload Image'}
                          aspectClassName={record.targetAspectRatio === 4 / 3 ? 'aspect-4/3' : 'aspect-16/9'}
                          guidance={`Target ratio: ${record.aspectRatioLabel}. Output: ${record.outputDimensions.width}×${record.outputDimensions.height}px.`}
                        />

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                            Alt Text
                          </label>
                          <input
                            type="text"
                            value={draft.altText}
                            onChange={(e) => updateDraft(record.key, { altText: e.target.value })}
                            disabled={saving || resetting}
                            maxLength={300}
                            className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e] disabled:opacity-60"
                            placeholder={record.defaultAlt}
                          />
                        </div>
                      </div>

                      <div className="mt-auto px-4 py-3 border-t border-stone-100 bg-[#faf8f5]/50 flex items-center justify-between gap-3">
                        <div className="text-[11px] leading-tight">
                          {renderSaveState(record)}
                          {record.updatedAt && !dirty && (
                            <span className="block text-stone-400 mt-0.5">
                              {record.updatedByName ? `by ${record.updatedByName} · ` : ''}
                              {new Date(record.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSave(record)}
                          disabled={!dirty || saving || resetting}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                            dirty
                              ? 'bg-[#461822] hover:bg-[#6c2432] text-white'
                              : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>{saving ? 'Saving...' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCrop && (
        <ImageCropEditor
          imageKey={activeCrop.key}
          sourceUrl={activeCrop.sourceUrl}
          initialCrop={activeCrop.cropMetadata}
          onApply={handleCropApplied}
          onCancel={() => setActiveCrop(null)}
        />
      )}
    </div>
  );
}
