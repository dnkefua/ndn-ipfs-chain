'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
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
  Tabs,
  Skeleton,
} from '@/components/ui';
import { useToast } from '@/components/ui/ToastProvider';
import { api } from '@/lib/api';

interface RecordRow {
  id: string;
  version?: number;
  cid: string;
  size?: number;
  updated_at?: string;
}

interface Version {
  version: number;
  cid: string;
  parent_cid?: string;
  created_at?: string;
}

interface SchemaRow {
  cid: string;
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

const QUERY_OPERATORS = `$eq  $ne  $gt  $gte  $lt  $lte  $in  $nin  $exists  $and  $or  $not
Dot paths: body.status, body.user.id, etc.`;

export default function CollectionDetailPage() {
  const params = useParams<{ name: string }>();
  const collectionName = decodeURIComponent(params.name);
  const { toast } = useToast();

  const [tab, setTab] = useState('records');
  const [collection, setCollection] = useState<any>(null);
  const [collectionLoading, setCollectionLoading] = useState(true);

  // Records tab
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [envelopeModal, setEnvelopeModal] = useState<any>(null);

  // New record modal
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [newBody, setNewBody] = useState('{\n  \n}');
  const [newSchemaCid, setNewSchemaCid] = useState('');
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [creating, setCreating] = useState(false);

  // Query tab
  const [filterJson, setFilterJson] = useState('{\n  "body.status": "active"\n}');
  const [queryResults, setQueryResults] = useState<RecordRow[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewRefresh, setViewRefresh] = useState('on_write');
  const [savingView, setSavingView] = useState(false);

  // Versions tab
  const [versionId, setVersionId] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionEnvelope, setVersionEnvelope] = useState<any>(null);

  useEffect(() => {
    setCollectionLoading(true);
    api.records
      .getCollection(collectionName)
      .then((d: any) => setCollection(d))
      .catch(() => {})
      .finally(() => setCollectionLoading(false));

    api.records.schemas
      .list()
      .then((d: { results?: SchemaRow[] }) => setSchemas(d.results ?? []))
      .catch(() => {});
  }, [collectionName]);

  const loadRecords = useCallback(
    async (cur?: string) => {
      setRecordsLoading(true);
      try {
        const data = await api.records.query(collectionName, {
          filter: {},
          limit: 20,
          cursor: cur,
        });
        setRecords(data.results ?? []);
        setNextCursor(data.next ?? undefined);
        setCursor(cur);
      } catch {
        // stay empty
      } finally {
        setRecordsLoading(false);
      }
    },
    [collectionName]
  );

  useEffect(() => {
    if (tab === 'records') loadRecords();
  }, [tab, loadRecords]);

  const handleNewRecord = async () => {
    let body: unknown;
    try {
      body = JSON.parse(newBody);
    } catch {
      toast({ title: 'Invalid JSON in body', variant: 'error' });
      return;
    }
    setCreating(true);
    try {
      const result = await api.records.put({
        collection: collectionName,
        ...(newId.trim() ? { id: newId.trim() } : {}),
        body,
        ...(newSchemaCid ? { schema_cid: newSchemaCid } : {}),
      });
      toast({ title: 'Record created', description: `CID: ${result.cid}`, variant: 'success' });
      setNewRecordOpen(false);
      setNewId('');
      setNewBody('{\n  \n}');
      await loadRecords();
    } catch (err: any) {
      toast({ title: 'Failed to create record', description: err?.message, variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleRunQuery = async () => {
    let filter: unknown;
    try {
      filter = JSON.parse(filterJson);
    } catch {
      toast({ title: 'Invalid JSON filter', variant: 'error' });
      return;
    }
    setQueryLoading(true);
    try {
      const data = await api.records.query(collectionName, { filter, limit: 50 });
      setQueryResults(data.results ?? []);
    } catch (err: any) {
      toast({ title: 'Query failed', description: err?.message, variant: 'error' });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    let filter: unknown;
    try {
      filter = JSON.parse(filterJson);
    } catch {
      toast({ title: 'Invalid JSON filter', variant: 'error' });
      return;
    }
    setSavingView(true);
    try {
      await api.records.views.create({
        name: viewName.trim(),
        collection: collectionName,
        filter,
        refresh: viewRefresh,
      });
      toast({ title: 'View saved', variant: 'success' });
      setSaveViewOpen(false);
      setViewName('');
    } catch (err: any) {
      toast({ title: 'Failed to save view', description: err?.message, variant: 'error' });
    } finally {
      setSavingView(false);
    }
  };

  const handleVersionHistory = async () => {
    if (!versionId.trim()) return;
    setVersionsLoading(true);
    try {
      const data = await api.records.history(collectionName, versionId.trim());
      setVersions(data.versions ?? []);
    } catch (err: any) {
      toast({ title: 'Failed to load history', description: err?.message, variant: 'error' });
    } finally {
      setVersionsLoading(false);
    }
  };

  const openVersionEnvelope = async (cid: string) => {
    try {
      const env = await api.records.getByCid(cid);
      setVersionEnvelope(env);
    } catch {
      toast({ title: 'Failed to load envelope', variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {collectionLoading ? (
            <Skeleton height={36} width={200} rounded="lg" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {collectionName}
              </h1>
              {collection?.head_cid && <CidCell cid={collection.head_cid} />}
              {collection?.schema_cid && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  schema: <span title={collection.schema_cid}>{collection.schema_cid.slice(0, 10)}…</span>
                </span>
              )}
            </div>
          )}
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setNewRecordOpen(true)}>
          New record
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'records', label: 'Records' },
          { value: 'query', label: 'Query' },
          { value: 'versions', label: 'Versions' },
        ]}
      >
        {/* Records tab */}
        {tab === 'records' && (
          <div className="mt-6 space-y-4">
            {recordsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} height={44} rounded="lg" />)}
              </div>
            ) : (
              <>
                <Table>
                  <THead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Version</Th>
                      <Th>CID</Th>
                      <Th>Size</Th>
                      <Th>Updated</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {records.map((r) => (
                      <Tr
                        key={r.cid}
                        className="cursor-pointer"
                        onClick={async () => {
                          try {
                            const env = await api.records.getByCid(r.cid);
                            setEnvelopeModal(env);
                          } catch {
                            toast({ title: 'Failed to load envelope', variant: 'error' });
                          }
                        }}
                      >
                        <Td className="font-mono text-xs">{r.id}</Td>
                        <Td>{r.version ?? '—'}</Td>
                        <Td><CidCell cid={r.cid} /></Td>
                        <Td>{r.size != null ? `${r.size}B` : '—'}</Td>
                        <Td className="text-xs text-slate-500">
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}
                        </Td>
                      </Tr>
                    ))}
                    {records.length === 0 && (
                      <Tr>
                        <Td colSpan={5} className="text-center text-slate-500 py-8">
                          No records found.
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    disabled={!cursor}
                    onClick={() => loadRecords(undefined)}
                  >
                    First
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    disabled={!nextCursor}
                    onClick={() => nextCursor && loadRecords(nextCursor)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Query tab */}
        {tab === 'query' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Textarea
                label="Filter (JSON)"
                value={filterJson}
                onChange={(e) => setFilterJson(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-pre">
                {QUERY_OPERATORS}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRunQuery} loading={queryLoading}>
                  Run query
                </Button>
                <Button variant="secondary" onClick={() => setSaveViewOpen(true)}>
                  Save as view
                </Button>
              </div>
            </div>
            <div>
              {queryLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} height={44} rounded="lg" />)}
                </div>
              ) : (
                <Table>
                  <THead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>CID</Th>
                      <Th>Version</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {queryResults.map((r) => (
                      <Tr key={r.cid}>
                        <Td className="font-mono text-xs">{r.id}</Td>
                        <Td><CidCell cid={r.cid} /></Td>
                        <Td>{r.version ?? '—'}</Td>
                      </Tr>
                    ))}
                    {queryResults.length === 0 && (
                      <Tr>
                        <Td colSpan={3} className="text-center text-slate-500 py-8">
                          Run a query to see results.
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* Versions tab */}
        {tab === 'versions' && (
          <div className="mt-6 space-y-6">
            <div className="flex gap-3">
              <Input
                placeholder="Record ID"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleVersionHistory} loading={versionsLoading}>
                Load history
              </Button>
            </div>
            {versionsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} height={64} rounded="lg" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v, i) => (
                  <div
                    key={v.cid}
                    className="relative pl-8 border-l-2 border-slate-200 dark:border-slate-700 ml-4"
                  >
                    <div className="absolute -left-2 top-3 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-white dark:border-slate-900" />
                    <div
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => openVersionEnvelope(v.cid)}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          v{v.version}
                        </span>
                        <CidCell cid={v.cid} />
                        {v.parent_cid && (
                          <span className="text-xs text-slate-500">
                            parent: <span className="font-mono">{v.parent_cid.slice(0, 10)}…</span>
                          </span>
                        )}
                        {v.created_at && (
                          <span className="text-xs text-slate-500 ml-auto">
                            {new Date(v.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {versions.length === 0 && !versionsLoading && (
                  <p className="text-slate-500 text-sm">Enter a record ID and click Load history.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Tabs>

      {/* Envelope modal */}
      <Modal
        open={!!envelopeModal}
        onClose={() => setEnvelopeModal(null)}
        title="Record envelope"
        size="xl"
      >
        <pre className="text-xs font-mono overflow-auto max-h-96 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
          {JSON.stringify(envelopeModal, null, 2)}
        </pre>
      </Modal>

      {/* Version envelope modal */}
      <Modal
        open={!!versionEnvelope}
        onClose={() => setVersionEnvelope(null)}
        title="Version envelope"
        size="xl"
      >
        <pre className="text-xs font-mono overflow-auto max-h-96 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
          {JSON.stringify(versionEnvelope, null, 2)}
        </pre>
      </Modal>

      {/* New record modal */}
      <Modal
        open={newRecordOpen}
        onClose={() => setNewRecordOpen(false)}
        title="New record"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewRecordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewRecord} loading={creating}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="ID (optional — auto-generated if empty)"
            placeholder="my-record-id"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <Textarea
            label="Body (JSON)"
            required
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <Select
            label="Schema (optional)"
            value={newSchemaCid}
            onChange={(e) => setNewSchemaCid(e.target.value)}
          >
            <option value="">No schema</option>
            {schemas.map((s) => (
              <option key={s.cid} value={s.cid}>
                {s.name} ({s.cid.slice(0, 10)}…)
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Save as view modal */}
      <Modal
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        title="Save as view"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaveViewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} loading={savingView} disabled={!viewName.trim()}>
              Save view
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="View name"
            required
            placeholder="active-events"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <Select
            label="Refresh mode"
            value={viewRefresh}
            onChange={(e) => setViewRefresh(e.target.value)}
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
