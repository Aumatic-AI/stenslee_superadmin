"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { getStorageUrl } from "@/lib/storage-url";

const DEFAULT_STORAGE_QUOTA_MB = 500;

interface FolderRow {
  id: string;
  name: string;
}

interface FileRow {
  id: string;
  file_name: string;
  storage_key: string;
  file_size_bytes: number;
}

interface Crumb {
  id: string | null;
  name: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function FolderIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 015.25 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18.75A2.25 2.25 0 0121 9v.776" />
    </svg>
  );
}

interface Props {
  organizationId: string;
}

// Platform-admin browse/moderation view of an org's Design Library --
// deliberately no create/upload here (that's the studio's own job); this is
// read + delete-for-moderation only. Deletes here are permanent (this app
// has no Trash of its own to route through -- studio's per-org Trash isn't
// something a platform admin session has a reason to open).
export default function LibraryTab({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitMb, setLimitMb] = useState(DEFAULT_STORAGE_QUOTA_MB);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Library" }]);
  const [viewingFile, setViewingFile] = useState<FileRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (id: string | null) => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const foldersQuery = supabase.from("folders").select("id, name").eq("organization_id", organizationId).is("deleted_at", null).order("name");
    const filesQuery = supabase
      .from("folder_files").select("id, file_name, storage_key, file_size_bytes")
      .eq("organization_id", organizationId).is("deleted_at", null).order("file_name");

    const crumbChain: Crumb[] = [];
    let cursor = id;
    while (cursor) {
      const { data } = await supabase.from("folders").select("id, name, parent_folder_id").eq("id", cursor).maybeSingle();
      if (!data) break;
      crumbChain.unshift({ id: data.id, name: data.name });
      cursor = data.parent_folder_id;
    }

    const [{ data: orgRow }, { data: accessRows }, { data: subfolders }, { data: fileRows }] = await Promise.all([
      supabase.from("organizations").select("storage_used_bytes").eq("id", organizationId).maybeSingle(),
      supabase.rpc("get_effective_access", { p_organization_id: organizationId, p_feature_key: "storage_quota" }),
      id ? foldersQuery.eq("parent_folder_id", id) : foldersQuery.is("parent_folder_id", null),
      id ? filesQuery.eq("folder_id", id) : filesQuery.is("folder_id", null),
    ]);

    setUsedBytes(orgRow?.storage_used_bytes ?? 0);
    const access = accessRows?.[0];
    setLimitMb(access?.enabled && access.limit_value != null ? access.limit_value : DEFAULT_STORAGE_QUOTA_MB);
    setFolders(subfolders ?? []);
    setFiles(fileRows ?? []);
    setCrumbs([{ id: null, name: "Library" }, ...crumbChain]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    async function run() { await load(folderId); }
    run();
  }, [folderId, load]);

  async function handleDeleteFolder(folder: FolderRow) {
    if (!window.confirm(`Permanently delete "${folder.name}" and everything inside it? This can't be undone.`)) return;
    setDeletingId(folder.id);
    setError("");
    const supabase = createSupabaseBrowserClient();

    const allFolderIds = [folder.id];
    let frontier = [folder.id];
    while (frontier.length > 0) {
      const { data: children } = await supabase.from("folders").select("id").in("parent_folder_id", frontier);
      const childIds = (children ?? []).map((c) => c.id);
      if (childIds.length === 0) break;
      allFolderIds.push(...childIds);
      frontier = childIds;
    }
    const { data: nestedFiles } = await supabase.from("folder_files").select("storage_key").in("folder_id", allFolderIds);
    const paths = (nestedFiles ?? []).map((f) => f.storage_key.replace("org-library/", ""));
    if (paths.length > 0) await supabase.storage.from("org-library").remove(paths);

    const { error: deleteError } = await supabase.from("folders").delete().eq("id", folder.id);
    setDeletingId(null);
    if (deleteError) { setError(deleteError.message); return; }
    load(folderId);
  }

  async function handleDeleteFile(file: FileRow) {
    if (!window.confirm(`Permanently delete "${file.file_name}"? This can't be undone.`)) return;
    setDeletingId(file.id);
    setError("");
    const supabase = createSupabaseBrowserClient();
    await supabase.storage.from("org-library").remove([file.storage_key.replace("org-library/", "")]);
    const { error: deleteError } = await supabase.from("folder_files").delete().eq("id", file.id);
    setDeletingId(null);
    if (deleteError) { setError(deleteError.message); return; }
    load(folderId);
  }

  const limitBytes = limitMb * 1024 * 1024;
  const usedPct = Math.min(100, (usedBytes / limitBytes) * 100);
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-cinzel text-sm font-bold tracking-wide text-ink uppercase">Design Library</h2>
        <div className="flex flex-col gap-1.5 min-w-[14rem]">
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden border border-cleo-border">
            <div className={`h-full rounded-full ${usedPct > 90 ? "bg-error" : "bg-gold"}`} style={{ width: `${usedPct}%` }} />
          </div>
          <p className="text-muted text-[10px] font-mono text-right">{formatBytes(usedBytes)} of {formatBytes(limitBytes)} used</p>
        </div>
      </div>

      {error && <p className="text-error text-sm font-mono">{error}</p>}

      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
        {crumbs.map((c, i) => (
          <span key={c.id ?? "root"} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted/40">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="text-gold font-bold">{c.name}</span>
            ) : (
              <button onClick={() => setFolderId(c.id)} className="text-muted hover:text-gold transition-colors cursor-pointer">{c.name}</button>
            )}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}
        </div>
      ) : isEmpty ? (
        <div className="bg-surface border border-cleo-border rounded-2xl p-10 text-center">
          <p className="text-muted text-sm">Nothing in this folder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {folders.map((f) => (
            <div key={f.id} className="group relative aspect-square rounded-xl border border-cleo-border hover:border-gold/40 transition-colors bg-surface">
              <button onClick={() => setFolderId(f.id)} className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 cursor-pointer">
                <FolderIcon className="w-12 h-12 text-gold/70 group-hover:text-gold transition-colors" />
                <span className="text-ink text-xs font-cinzel font-bold text-center truncate w-full">{f.name}</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(f)} disabled={deletingId === f.id} title="Delete folder"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-bg/80 border border-cleo-border text-muted hover:text-error hover:border-error/40 transition-all flex items-center justify-center cursor-pointer"
              >
                {deletingId === f.id ? <div className="w-3 h-3 border-2 border-error border-t-transparent rounded-full animate-spin" /> : "×"}
              </button>
            </div>
          ))}
          {files.map((f) => (
            <div key={f.id} className="group relative aspect-square rounded-xl overflow-hidden border border-cleo-border hover:border-gold/40 transition-colors bg-surface-2">
              <button onClick={() => setViewingFile(f)} className="w-full h-full cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getStorageUrl(f.storage_key) ?? undefined} alt={f.file_name} className="w-full h-full object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5 pointer-events-none">
                <p className="text-white text-[10px] font-mono truncate">{f.file_name}</p>
                <p className="text-white/70 text-[9px] font-mono">{formatBytes(f.file_size_bytes)}</p>
              </div>
              <button
                onClick={() => handleDeleteFile(f)} disabled={deletingId === f.id} title="Delete file"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 border border-white/20 text-white/80 hover:text-error hover:border-error/60 transition-all flex items-center justify-center cursor-pointer"
              >
                {deletingId === f.id ? <div className="w-3 h-3 border-2 border-error border-t-transparent rounded-full animate-spin" /> : "×"}
              </button>
            </div>
          ))}
        </div>
      )}

      {viewingFile && (
        <div
          onClick={() => setViewingFile(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <button onClick={() => setViewingFile(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center text-xl cursor-pointer">×</button>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-3 max-w-2xl w-full">
            <div className="relative w-full rounded-2xl overflow-hidden border border-cleo-border" style={{ aspectRatio: "1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getStorageUrl(viewingFile.storage_key) ?? undefined} alt={viewingFile.file_name} className="w-full h-full object-contain bg-black" />
            </div>
            <p className="text-white/80 text-xs font-mono">{viewingFile.file_name} · {formatBytes(viewingFile.file_size_bytes)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
