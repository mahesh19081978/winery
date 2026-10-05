'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Info,
  Loader2,
  Move,
  Eye,
} from 'lucide-react';
import type { WebsiteImageKey, CropMetadata, CropRecommendation } from '@/lib/website-images';
import { WEBSITE_IMAGES, getCropRecommendation } from '@/lib/website-images';

export interface ImageCropEditorProps {
  imageKey: WebsiteImageKey;
  sourceUrl: string;
  initialCrop?: CropMetadata | null;
  onApply: (result: {
    croppedUrl: string;
    cropMetadata: CropMetadata;
    originalUrl: string;
    width: number;
    height: number;
    mime: string;
    filename: string;
  }) => void | Promise<void>;
  onCancel: () => void;
}

export function ImageCropEditor({
  imageKey,
  sourceUrl,
  initialCrop,
  onApply,
  onCancel,
}: ImageCropEditorProps) {
  const def = WEBSITE_IMAGES[imageKey];
  const targetRatio = def?.targetAspectRatio || 16 / 9;
  const targetRatioLabel = def?.aspectRatioLabel || '16:9';

  // Loaded natural image dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Crop manipulation state
  // zoom: 1.0 = minimum fit scale where the image covers the crop frame, up to 3.0
  const [zoom, setZoom] = useState(initialCrop?.zoom || 1.0);
  // Pan offset in percentage (-50 to +50 relative to centered alignment)
  // 0, 0 means centered.
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive frame reference
  const frameRef = useRef<HTMLDivElement>(null);

  // Load natural dimensions of source image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      setLoadError('');
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImgLoaded(true);

      // If initialCrop was provided, restore pan and zoom
      if (initialCrop && Math.abs(initialCrop.targetAspectRatio - targetRatio) < 0.01) {
        setZoom(Math.max(1, initialCrop.zoom || 1));
        const maxOffsetXPct = Math.max(0, 100 - initialCrop.cropWidth);
        const maxOffsetYPct = Math.max(0, 100 - initialCrop.cropHeight);
        // In our coordinate system:
        // panX = -100 corresponds to cropX = 0
        // panX = +100 corresponds to cropX = maxOffsetXPct
        // panX = 0 corresponds to cropX = maxOffsetXPct / 2
        const pX = maxOffsetXPct > 0 ? ((initialCrop.cropX - maxOffsetXPct / 2) / (maxOffsetXPct / 2)) * 100 : 0;
        const pY = maxOffsetYPct > 0 ? ((initialCrop.cropY - maxOffsetYPct / 2) / (maxOffsetYPct / 2)) * 100 : 0;
        setPanX(Math.max(-100, Math.min(100, pX)));
        setPanY(Math.max(-100, Math.min(100, pY)));
      } else {
        // Smart Initial Crop Heuristics:
        // Default: center the crop (panX = 0, panY = 0)
        // If image is portrait (tall), bias slightly towards top-third (panY = -30%)
        const origRatio = img.naturalWidth / img.naturalHeight;
        if (origRatio < targetRatio * 0.8) {
          setPanY(-30);
          setPanX(0);
        } else {
          setPanX(0);
          setPanY(0);
        }
        setZoom(1.0);
      }
    };
    img.onerror = () => {
      if (!active) return;
      setLoadError('Failed to load image for cropping.');
    };
    img.src = sourceUrl;
    return () => {
      active = false;
    };
  }, [sourceUrl, initialCrop, targetRatio]);

  // Compute recommendation
  const recommendation: CropRecommendation | null = useMemo(() => {
    if (!naturalSize) return null;
    return getCropRecommendation(imageKey, naturalSize.width, naturalSize.height);
  }, [imageKey, naturalSize]);

  // Calculate the scaled layout of the image inside the crop frame
  // The crop frame has aspect ratio = targetRatio.
  // When zoom = 1, the image is scaled to 'cover' the crop frame (fill it completely).
  const layout = useMemo(() => {
    if (!naturalSize) {
      return {
        imgWidthPct: 100,
        imgHeightPct: 100,
        maxPanXPct: 0,
        maxPanYPct: 0,
      };
    }

    const { width: nw, height: nh } = naturalSize;
    const imgRatio = nw / nh;

    // At zoom = 1, to 'cover' a frame of aspect ratio `targetRatio`:
    // If imgRatio > targetRatio (image wider than frame):
    //   Image height matches frame height (100%), image width is (imgRatio / targetRatio) * 100%
    // If imgRatio < targetRatio (image taller than frame):
    //   Image width matches frame width (100%), image height is (targetRatio / imgRatio) * 100%
    let baseWidthPct: number;
    let baseHeightPct: number;

    if (imgRatio >= targetRatio) {
      baseHeightPct = 100;
      baseWidthPct = (imgRatio / targetRatio) * 100;
    } else {
      baseWidthPct = 100;
      baseHeightPct = (targetRatio / imgRatio) * 100;
    }

    // Applying zoom scales both dimensions
    const imgWidthPct = baseWidthPct * zoom;
    const imgHeightPct = baseHeightPct * zoom;

    // Maximum margin that the image can move before showing black bars / empty space:
    // Left edge of image cannot be > 0 (would show gap on left)
    // Right edge cannot be < frame width (would show gap on right)
    // So the allowed offset ranges from -(imgWidthPct - 100)% to 0%
    const maxPanXPct = Math.max(0, imgWidthPct - 100);
    const maxPanYPct = Math.max(0, imgHeightPct - 100);

    return {
      imgWidthPct,
      imgHeightPct,
      maxPanXPct,
      maxPanYPct,
    };
  }, [naturalSize, targetRatio, zoom]);

  // Clamp panX and panY based on layout margins
  // panX: 0 = centered, -100 = leftmost valid offset, +100 = rightmost valid offset
  const currentOffsets = useMemo(() => {
    const { maxPanXPct, maxPanYPct } = layout;

    // Center offset is -maxPanXPct / 2
    // Range is from -maxPanXPct to 0
    const offsetX = maxPanXPct > 0 ? -(maxPanXPct / 2) + (panX / 100) * (maxPanXPct / 2) : 0;
    const offsetY = maxPanYPct > 0 ? -(maxPanYPct / 2) + (panY / 100) * (maxPanYPct / 2) : 0;

    // Strictly clamp between -maxPanPct and 0 to ensure zero black gaps
    const clampedOffsetX = Math.min(0, Math.max(-maxPanXPct, offsetX));
    const clampedOffsetY = Math.min(0, Math.max(-maxPanYPct, offsetY));

    return {
      offsetX: clampedOffsetX,
      offsetY: clampedOffsetY,
    };
  }, [layout, panX, panY]);

  // Calculate actual normalized crop rect (cropX, cropY, cropWidth, cropHeight in percent of natural image)
  const currentCropRect = useMemo((): CropMetadata => {
    if (!naturalSize) {
      return {
        cropX: 0,
        cropY: 0,
        cropWidth: 100,
        cropHeight: 100,
        zoom,
        targetAspectRatio: targetRatio,
        unit: 'percent',
      };
    }

    const { imgWidthPct, imgHeightPct } = layout;
    const { offsetX, offsetY } = currentOffsets;

    // Inside the scaled image of size (imgWidthPct x imgHeightPct):
    // The visible frame is from (-offsetX) to (-offsetX + 100) in frame percent units
    // Relative to the image size:
    const cropXPct = (-offsetX / imgWidthPct) * 100;
    const cropYPct = (-offsetY / imgHeightPct) * 100;
    const cropWidthPct = (100 / imgWidthPct) * 100;
    const cropHeightPct = (100 / imgHeightPct) * 100;

    return {
      cropX: Math.round(Math.max(0, cropXPct) * 100) / 100,
      cropY: Math.round(Math.max(0, cropYPct) * 100) / 100,
      cropWidth: Math.round(Math.min(100, cropWidthPct) * 100) / 100,
      cropHeight: Math.round(Math.min(100, cropHeightPct) * 100) / 100,
      zoom: Math.round(zoom * 100) / 100,
      targetAspectRatio: targetRatio,
      unit: 'percent',
    };
  }, [naturalSize, layout, currentOffsets, zoom, targetRatio]);

  // Pointer drag handlers for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX,
      panY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    const frame = frameRef.current;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();

    // Map pixel drag delta directly to pan percentage
    // Moving pointer to the right should increase panX (move image right, showing more of left)
    const panScaleX = layout.maxPanXPct > 0 ? (dx / frameRect.width) * (100 / (layout.maxPanXPct / 200)) : 0;
    const panScaleY = layout.maxPanYPct > 0 ? (dy / frameRect.height) * (100 / (layout.maxPanYPct / 200)) : 0;

    setPanX(Math.max(-100, Math.min(100, dragStartRef.current.panX + panScaleX)));
    setPanY(Math.max(-100, Math.min(100, dragStartRef.current.panY + panScaleY)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture already released
      }
    }
  };

  // Reset to default
  const handleReset = useCallback(() => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  }, []);

  // Confirm crop and execute server crop
  const handleConfirm = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/website-images/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: imageKey,
          sourceUrl,
          crop: currentCropRect,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to apply crop');
      }

      await onApply({
        croppedUrl: json.data.url,
        cropMetadata: json.data.cropData,
        originalUrl: sourceUrl,
        width: json.data.width,
        height: json.data.height,
        mime: json.data.mime,
        filename: json.data.filename,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Crop processing failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-stone-900">
                Visual Crop Editor · {def?.label || imageKey}
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#461822]/10 text-[#461822]">
                Target: {targetRatioLabel}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Drag image inside frame to position your subject. Zoom in to frame important details.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Smart Aspect Ratio & Recommendation Banner */}
          {recommendation && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                recommendation.matchesRecommended
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <Sparkles
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  recommendation.matchesRecommended ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                  <span>Recommended crop: <strong>{recommendation.recommendedRatioLabel}</strong></span>
                  <span className="text-stone-400">·</span>
                  <span>
                    Original image: <strong>{recommendation.originalWidth} × {recommendation.originalHeight}</strong>
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="capitalize">{recommendation.orientation} orientation</span>
                </div>
                <p className="text-[11px] opacity-90">{recommendation.message}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loadError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {loadError}
            </div>
          )}

          {/* Interactive Crop Frame Area */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl bg-stone-900 rounded-xl p-4 shadow-inner flex flex-col items-center justify-center select-none">
              <div className="w-full flex items-center justify-between text-[11px] text-stone-400 mb-2 px-1">
                <span className="flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-stone-300" />
                  Drag to pan subject
                </span>
                <span className="font-mono text-stone-300">
                  Visible frame ({targetRatioLabel} locked)
                </span>
              </div>

              {/* Crop Frame with exact aspect ratio */}
              <div
                ref={frameRef}
                style={{ aspectRatio: `${targetRatio}` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full max-h-[46vh] rounded-lg overflow-hidden border-2 border-[#c5a059] shadow-2xl cursor-grab active:cursor-grabbing bg-stone-950"
              >
                {!imgLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-[#c5a059] mb-2" />
                  </div>
                ) : (
                  <>
                    {/* Rendered image sized to cover target frame with zero black margins */}
                    <div
                      className="absolute pointer-events-none transition-transform duration-75 ease-out"
                      style={{
                        width: `${layout.imgWidthPct}%`,
                        height: `${layout.imgHeightPct}%`,
                        left: `${currentOffsets.offsetX}%`,
                        top: `${currentOffsets.offsetY}%`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sourceUrl}
                        alt="Crop target"
                        className="w-full h-full object-fill select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>

                    {/* Rule of thirds grid overlay */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-white/60" />
                      <div className="border-r border-white/60" />
                      <div />
                    </div>

                    {/* Badge indicator on bottom left of frame */}
                    <div className="absolute bottom-2 left-2 pointer-events-none px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white/90 font-mono">
                      Exact website container view
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full max-w-2xl mt-4 px-2 flex flex-wrap items-center justify-between gap-4">
              {/* Zoom Slider */}
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                  className="p-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#461822] cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-stone-600 w-10 text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                  className="p-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Reset Crop */}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Crop</span>
              </button>
            </div>
          </div>

          {/* Website Preview Comparison (Requirement 11) */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-2">
              <Eye className="w-3.5 h-3.5 text-[#6c2432]" />
              <span>Live Website Preview</span>
              <span className="text-[11px] text-stone-400 font-normal">
                (This is the exact portion that will appear in the slot)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/70 p-3 rounded-xl border border-stone-200/80">
              {/* Original Image thumbnail */}
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  1. Original Upload
                </span>
                <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-stone-200 border border-stone-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceUrl}
                    alt="Original Upload"
                    className="w-full h-full object-contain bg-stone-900/10"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
                    {naturalSize ? `${naturalSize.width}×${naturalSize.height}` : '...'}
                  </div>
                </div>
              </div>

              {/* Target Slot Preview */}
              <div>
                <span className="text-[11px] font-semibold text-[#461822] uppercase tracking-wider block mb-1">
                  2. Website Slot Preview ({targetRatioLabel})
                </span>
                <div
                  style={{ aspectRatio: `${targetRatio}` }}
                  className="relative rounded-lg overflow-hidden bg-stone-900 border border-stone-300 shadow-xs"
                >
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: `${layout.imgWidthPct}%`,
                      height: `${layout.imgHeightPct}%`,
                      left: `${currentOffsets.offsetX}%`,
                      top: `${currentOffsets.offsetY}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceUrl}
                      alt="Crop Result"
                      className="w-full h-full object-fill"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>Original image is preserved in storage so you can re-crop anytime.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !imgLoaded}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium transition shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{saving ? 'Applying Crop...' : 'Apply Crop'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
