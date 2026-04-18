'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Plus, Copy, Check } from 'lucide-react';
import Link from 'next/link';
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
import { SCHEMA_TEMPLATES, getTemplate } from '@/lib/schemaTemplates';

type SchemaMode = 'none' | 'existing' | 'template';

interface Collection {
  name: string;
  record_count?: number;
  schema_cid?: string;
  head_cid?: string;
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
  const copy = async () => {
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

export default function RecordsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [schemaCid, setSchemaCid] = useState('');
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [schemaMode, setSchemaMode] = useState<SchemaMode>('none');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SCHEMA_TEMPLATES[0].id);
  const [templateJson, setTemplateJson] = useState<string>(
    JSON.stringify(SCHEMA_TEMPLATES[0].schema, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = getTemplate(id);
    if (tpl) setTemplateJson(JSON.stringify(tpl.schema, null, 2));
    setJsonError(null);
  };

  const resetModal = () => {
    setModalOpen(false);
    setName('');
    setSchemaCid('');
    setSchemaMode('none');
    setSelectedTemplateId(SCHEMA_TEMPLATES[0].id);
    setTemplateJson(JSON.stringify(SCHEMA_TEMPLATES[0].schema, null, 2));
    setJsonError(null);
  };

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.records.listCollections();
      setCollections(data.results ?? []);
    } catch {
      // stay with empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
    api.records.schemas
      .list()
      .then((d: { results?: SchemaRow[] }) => setSchemas(d.results ?? []))
      .catch(() => {});
  }, [loadCollections]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Resolve schema_cid based on the selected mode.
    let resolvedSchemaCid: string | undefined;

    if (schemaMode === 'existing') {
      resolvedSchemaCid = schemaCid || undefined;
    } else if (schemaMode === 'template') {
      // Parse + upload the (possibly edited) template schema first.
      let parsed: unknown;
      try {
        parsed = JSON.parse(templateJson);
        setJsonError(null);
      } catch (e: any) {
        const msg = e?.message ?? 'Invalid JSON';
        setJsonError(msg);
        toast({ title: 'Invalid JSON in schema', description: msg, variant: 'error' });
        return;
      }
      setCreating(true);
      try {
        const tpl = getTemplate(selectedTemplateId);
        const schemaName = `${name.trim()}-schema-${Date.now()}`;
        const res = await api.records.schemas.create({
          name: schemaName,
          schema: parsed,
          dialect: (parsed as { $schema?: string })?.$schema,
        });
        resolvedSchemaCid = res?.cid;
        if (tpl) {
          toast({
            title: `${tpl.label} schema uploaded`,
            description: resolvedSchemaCid?.slice(0, 16) + '…',
            variant: 'success',
          });
        }
      } catch (err: any) {
        toast({
          title: 'Schema upload failed',
          description: err?.response?.data?.error ?? err?.message,
          variant: 'error',
        });
        setCreating(false);
        return;
      }
    }

    setCreating(true);
    try {
      await api.records.createCollection({
        name: name.trim(),
        ...(resolvedSchemaCid ? { schema_cid: resolvedSchemaCid } : {}),
      });
      toast({ title: 'Collection created', variant: 'success' });
      resetModal();
      await loadCollections();
    } catch (err: any) {
      toast({
        title: 'Failed to create collection',
        description: err?.response?.data?.error ?? err?.message,
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Records</h1>
            <Link
              href="/dashboard/docs"
              className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold border border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              NDP v1.0
            </Link>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Structured, content-addressed records — three data planes, one protocol.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          New collection
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={48} rounded="lg" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={<Database className="w-12 h-12" />}
          title="No collections yet"
          description="Create your first collection to start storing structured records on-chain."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              New collection
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Records</Th>
              <Th>Schema CID</Th>
              <Th>Head CID</Th>
              <Th>Created</Th>
            </Tr>
          </THead>
          <TBody>
            {collections.map((col) => (
              <Tr
                key={col.name}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/records/${encodeURIComponent(col.name)}`)}
              >
                <Td className="font-medium text-slate-900 dark:text-slate-100">{col.name}</Td>
                <Td>{col.record_count ?? '—'}</Td>
                <Td><CidCell cid={col.schema_cid} /></Td>
                <Td><CidCell cid={col.head_cid} /></Td>
                <Td className="text-xs text-slate-500">
                  {col.created_at ? new Date(col.created_at).toLocaleDateString() : '—'}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {/* New collection modal */}
      <Modal
        open={modalOpen}
        onClose={resetModal}
        title="New collection"
        description="Collections are the top-level namespaces for NDP records."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={resetModal}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Name"
            required
            placeholder="e.g. events"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Schema mode selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Schema
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'none', label: 'No schema', hint: 'Free-form JSON' },
                  { id: 'existing', label: 'Existing', hint: 'Use a schema you uploaded' },
                  { id: 'template', label: 'Template', hint: 'Start from a preset' },
                ] as { id: SchemaMode; label: string; hint: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSchemaMode(opt.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    schemaMode === opt.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {schemaMode === 'existing' && (
            <Select
              label="Choose an uploaded schema"
              value={schemaCid}
              onChange={(e) => setSchemaCid(e.target.value)}
            >
              <option value="">— select —</option>
              {schemas.map((s) => (
                <option key={s.cid} value={s.cid}>
                  {s.name} ({s.cid.slice(0, 10)}…)
                </option>
              ))}
            </Select>
          )}

          {schemaMode === 'template' && (
            <div className="space-y-3">
              <Select
                label="Template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {SCHEMA_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {getTemplate(selectedTemplateId)?.description}
              </div>
              <Textarea
                label="Schema (JSON Schema Draft 2020-12, editable)"
                value={templateJson}
                onChange={(e) => {
                  setTemplateJson(e.target.value);
                  setJsonError(null);
                }}
                rows={14}
                className="font-mono text-xs"
              />
              {jsonError && (
                <div className="text-xs text-red-600 dark:text-red-400">Invalid JSON: {jsonError}</div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                On create, this schema is uploaded first (POST /records/schemas), then the
                collection is created bound to the returned CID.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
