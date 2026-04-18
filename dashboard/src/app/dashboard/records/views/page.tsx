'use client';

import { useEffect, useState, useCallback } from 'react';
import { Eye, Plus, Copy, Check } from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { useToast } from '@/components/ui/ToastProvider';
import { api } from '@/lib/api';

interface ViewRow {
  name: string;
  collection: string;
  refresh_mode?: string;
  head_cid?: string;
  last_result_count?: number;
  updated_at?: string;
  filter?: unknown;
  projection?: unknown;
  sort?: unknown;
}

interface CollectionRow {
  name: string;
}

function CidCell({ cid }: { cid?: string }) {
  const [copied, setCopied] = useState(false);
  if (!cid) return <span className="text-slate-400">—</span>;
  const short = cid.slice(0, 12) + '…' + cid.slice(-6);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs">
      <span title={cid}>{short}</span>
      <button onClick={copy} className="text-slate-400 hover:text-brand-600 transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

export default function ViewsPage() {
  const { toast } = useToast();

  const [views, setViews] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailView, setDetailView] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  // New view form
  const [viewName, setViewName] = useState('');
  const [collection, setCollection] = useState('');
  const [filterJson, setFilterJson] = useState('{\n  \n}');
  const [refreshMode, setRefreshMode] = useState('on_write');
  const [creating, setCreating] = useState(false);
  const [collections, setCollections] = useState<CollectionRow[]>([]);

  const loadViews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.records.views.list();
      setViews(data.results ?? []);
    } catch {
      // stay empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViews();
    api.records
      .listCollections()
      .then((d: { results?: CollectionRow[] }) => setCollections(d.results ?? []))
      .catch(() => {});
  }, [loadViews]);

  const openDetail = async (row: ViewRow) => {
    try {
      const data = await api.records.views.get(row.name);
      setDetailView(data);
      setDetailOpen(true);
    } catch {
      toast({ title: 'Failed to load view', variant: 'error' });
    }
  };

  const handleCreate = async () => {
    if (!viewName.trim() || !collection) return;
    let filter: unknown;
    try {
      filter = JSON.parse(filterJson);
    } catch {
      toast({ title: 'Invalid JSON filter', variant: 'error' });
      return;
    }
    setCreating(true);
    try {
      await api.records.views.create({
        name: viewName.trim(),
        collection,
        filter,
        refresh: refreshMode,
      });
      toast({ title: 'View created', variant: 'success' });
      setNewOpen(false);
      setViewName('');
      setCollection('');
      setFilterJson('{\n  \n}');
      await loadViews();
    } catch (err: any) {
      toast({ title: 'Failed to create view', description: err?.message, variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const snapshot = detailView?.snapshot;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Views</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Materialized query snapshots over NDP record collections.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setNewOpen(true)}>
          New view
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={48} rounded="lg" />)}
        </div>
      ) : views.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-12 h-12" />}
          title="No views yet"
          description="Create a view to materialize a filtered query over a collection."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setNewOpen(true)}>
              New view
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Collection</Th>
              <Th>Refresh</Th>
              <Th>Head CID</Th>
              <Th>Results</Th>
              <Th>Updated</Th>
            </Tr>
          </THead>
          <TBody>
            {views.map((v) => (
              <Tr key={v.name} className="cursor-pointer" onClick={() => openDetail(v)}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">{v.name}</Td>
                <Td className="font-mono text-xs">{v.collection}</Td>
                <Td>{v.refresh_mode ?? '—'}</Td>
                <Td><CidCell cid={v.head_cid} /></Td>
                <Td>{v.last_result_count ?? '—'}</Td>
                <Td className="text-xs text-slate-500">
                  {v.updated_at ? new Date(v.updated_at).toLocaleDateString() : '—'}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detailView?.view?.name ?? 'View detail'}
        size="xl"
      >
        {detailView && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Collection</span>
                <p className="font-mono mt-0.5">{detailView.view?.collection}</p>
              </div>
              <div>
                <span className="text-slate-500">Refresh</span>
                <p className="mt-0.5">{detailView.view?.refresh_mode ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Filter</p>
              <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-lg p-3 overflow-auto max-h-32 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(detailView.view?.filter, null, 2)}
              </pre>
            </div>
            {detailView.view?.projection && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Projection</p>
                <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-lg p-3 overflow-auto max-h-24 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(detailView.view.projection, null, 2)}
                </pre>
              </div>
            )}
            {snapshot && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Snapshot results ({snapshot.results?.length ?? 0})</p>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {(snapshot.results ?? []).map((r: any) => (
                    <div key={r.cid} className="flex items-center gap-3 text-xs font-mono p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span className="text-slate-500">{r.id}</span>
                      <CidCell cid={r.cid} />
                    </div>
                  ))}
                  {(!snapshot.results || snapshot.results.length === 0) && (
                    <p className="text-sm text-slate-500">No results in snapshot.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New view modal */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New view"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!viewName.trim() || !collection}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="View name"
            required
            placeholder="active-users"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <Select
            label="Collection"
            required
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="">Select a collection…</option>
            {collections.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
          <Textarea
            label="Filter (JSON)"
            required
            value={filterJson}
            onChange={(e) => setFilterJson(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <Select
            label="Refresh mode"
            value={refreshMode}
            onChange={(e) => setRefreshMode(e.target.value)}
            options={[
              { value: 'on_write', label: 'On write' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
