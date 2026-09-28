'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Image as ImageIcon,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Layers,
  Camera,
  Plus,
  Trash2,
  Edit2,
  Upload,
  X,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { StatCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';
import { useIsMounted } from '@/hooks/useIsMounted';

interface GalleryImageItem {
  id: string;
  wineryId: string;
  title: string;
  category: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  'Vineyard',
  'Cellar',
  'Wine',
  'Food',
  'Events',
  'Sunset',
  'Architecture',
  'Tasting Salon',
];

export function GalleryAdminClient() {
  const mounted = useIsMounted();
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Preview Modal
  const [activeModalImage, setActiveModalImage] = useState<GalleryImageItem | null>(null);

  // Edit/Add Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImageItem | null>(null);
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const [editorError, setEditorError] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Vineyard');
  const [formCaption, setFormCaption] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/gallery');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load gallery images');
      setImages(json.data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching gallery assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/gallery');
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json.error || 'Failed to load gallery images');
          setImages(json.data.images || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error fetching gallery assets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingImage(null);
    setFormTitle('');
    setFormCategory('Vineyard');
    setFormCaption('');
    setFormImageUrl('');
    setFormSortOrder(images.length);
    setFormIsActive(true);
    setEditorError('');
    setIsEditorOpen(true);
  };

  const openEditModal = (img: GalleryImageItem) => {
    setEditingImage(img);
    setFormTitle(img.title);
    setFormCategory(img.category);
    setFormCaption(img.caption || '');
    setFormImageUrl(img.imageUrl);
    setFormSortOrder(img.sortOrder);
    setFormIsActive(img.isActive);
    setEditorError('');
    setIsEditorOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    setEditorError('');

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/admin/gallery/upload', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Upload failed');
      }

      setFormImageUrl(json.data.url);
      if (!formTitle) {
        // Derive clean title from filename
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setFormTitle(cleanName);
      }
      setUploadProgress('Upload complete');
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setEditorError('Title is required');
      return;
    }
    if (!formImageUrl.trim()) {
      setEditorError('Please provide an image URL or upload an image file');
      return;
    }

    setEditorSubmitting(true);
    setEditorError('');

    try {
      if (editingImage) {
        // Update existing
        const res = await fetch(`/api/admin/gallery/${editingImage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            category: formCategory,
            caption: formCaption.trim() || null,
            imageUrl: formImageUrl.trim(),
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update image');

        setImages((prev) =>
          prev.map((i) => (i.id === editingImage.id ? json.data.image : i))
        );
        setSuccessMsg(`Image "${formTitle}" updated successfully`);
      } else {
        // Create new
        const res = await fetch('/api/admin/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            category: formCategory,
            caption: formCaption.trim() || null,
            imageUrl: formImageUrl.trim(),
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create image');

        setImages((prev) => [json.data.image, ...prev]);
        setSuccessMsg(`Image "${formTitle}" added to library`);
      }

      setIsEditorOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setEditorSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete image');

      setImages((prev) => prev.filter((img) => img.id !== id));
      setSuccessMsg(`Image "${title}" deleted`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting image');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (img: GalleryImageItem) => {
    try {
      const newStatus = !img.isActive;
      const res = await fetch(`/api/admin/gallery/${img.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to toggle visibility');

      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, isActive: newStatus } : i))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    CATEGORY_OPTIONS.forEach((c) => set.add(c));
    images.forEach((img) => set.add(img.category));
    return Array.from(set).sort();
  }, [images]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = img.title.toLowerCase().includes(q);
        const matchesCaption = img.caption?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesCaption) return false;
      }
      if (categoryFilter && img.category !== categoryFilter) return false;
      return true;
    });
  }, [images, search, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-mono font-medium text-[#6c2432]">
              Engagement
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono text-stone-500">Visual Media Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium mt-1">
            Estate Gallery
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Architectural photography, cellar archives, vineyard landscapes, and guest experience showcases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchImages}
            disabled={mounted ? loading : false}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading && mounted ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Gallery</span>
          </a>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Published Assets"
          value={images.filter((i) => i.isActive).length}
          subtitle="Active on visitor website"
          icon={ImageIcon}
        />
        <StatCard
          title="Asset Categories"
          value={categories.length}
          subtitle="Cellar, Vineyard, Sunset, Wine"
          icon={Layers}
        />
        <StatCard
          title="Estate Winery"
          value="Domaine Élysée"
          subtitle="Managed media repository"
          icon={Camera}
        />
        <StatCard
          title="CDN Delivery"
          value="Optimal"
          subtitle="Ultra-high definition assets"
          icon={Sparkles}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search photographs by title or narrative caption..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#aa853e]"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none text-stone-700"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#6c2432] mb-2" />
          <span className="text-xs">Loading media assets...</span>
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-7 h-7" />}
          title="No images found"
          description={
            search
              ? 'No media matches your search term.'
              : 'No estate images have been uploaded yet.'
          }
          actionText="Upload First Image"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className={`group bg-white rounded-xl border ${
                img.isActive ? 'border-stone-200/80' : 'border-stone-200 opacity-75'
              } shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between`}
            >
              <div>
                <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                  <Image
                    src={img.imageUrl}
                    alt={img.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => setActiveModalImage(img)}
                  />
                  <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalImage(img);
                      }}
                      className="p-2 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 pointer-events-auto shadow-md"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(img);
                      }}
                      className="p-2 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 pointer-events-auto shadow-md"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id, img.title);
                      }}
                      disabled={deletingId === img.id}
                      className="p-2 rounded-full bg-rose-900/80 text-white hover:bg-rose-900 pointer-events-auto shadow-md"
                      title="Delete"
                    >
                      {deletingId === img.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-stone-900/70 text-stone-100 backdrop-blur-xs">
                      {img.category}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(img);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider transition ${
                        img.isActive
                          ? 'bg-emerald-600/90 text-white'
                          : 'bg-stone-700/90 text-stone-300'
                      }`}
                      title="Click to toggle visibility"
                    >
                      {img.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif font-medium text-sm text-stone-900 leading-snug line-clamp-1">
                      {img.title}
                    </h3>
                    <StatusBadge status={img.isActive ? 'ACTIVE' : 'DRAFT'} size="sm" />
                  </div>
                  {img.caption && (
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {img.caption}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-stone-100 bg-[#faf8f5]/50 flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span>Order: #{img.sortOrder}</span>
                <span>{new Date(img.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Modal */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 bg-[#faf8f5] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6c2432] font-semibold">
                  VINORA Media Engine
                </span>
                <h3 className="text-lg font-serif font-medium text-stone-900">
                  {editingImage ? 'Edit Gallery Photograph' : 'Add New Gallery Photograph'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editorError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editorError}</span>
                </div>
              )}

              {/* Upload Drop Zone / Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block">
                  Media File or URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://... or upload a local file below"
                    className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                  </button>
                </div>
                {uploadProgress && (
                  <p className="text-[11px] text-stone-500 font-mono">{uploadProgress}</p>
                )}

                {/* Preview Image if URL is set */}
                {formImageUrl && (
                  <div className="relative mt-2 aspect-16/9 w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                    <Image
                      src={formImageUrl}
                      alt="Preview"
                      fill
                      sizes="400px"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                    Photograph Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Misty Terraces at Dawn"
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432] bg-white text-stone-700"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                  Narrative Caption (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Atmospheric context, parcel location, vintage details..."
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                />
              </div>

              {/* Sort Order & Visibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-stone-100">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block mb-1">
                    Sort Order (Lower appears first)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="isActiveToggle"
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-[#6c2432] focus:ring-[#6c2432] h-4 w-4"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs text-stone-700 font-medium">
                    Published &amp; Active on Visitor Website
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editorSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#461822] hover:bg-[#6c2432] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {editorSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingImage ? 'Save Changes' : 'Create Asset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeModalImage && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveModalImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-16/10 w-full bg-stone-900">
              <Image
                src={activeModalImage.imageUrl}
                alt={activeModalImage.title}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className="object-cover"
              />
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#461822]/10 text-[#6c2432]">
                  {activeModalImage.category}
                </span>
                <button
                  onClick={() => setActiveModalImage(null)}
                  className="text-xs font-mono uppercase text-stone-400 hover:text-stone-700"
                >
                  Close [ESC]
                </button>
              </div>
              <h3 className="font-serif text-xl font-medium text-stone-900">
                {activeModalImage.title}
              </h3>
              {activeModalImage.caption && (
                <p className="text-sm text-stone-600 leading-relaxed">
                  {activeModalImage.caption}
                </p>
              )}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-mono text-stone-500">
                  Sort Order: #{activeModalImage.sortOrder} • Status: {activeModalImage.isActive ? 'Active' : 'Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const img = activeModalImage;
                    setActiveModalImage(null);
                    openEditModal(img);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Media</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
