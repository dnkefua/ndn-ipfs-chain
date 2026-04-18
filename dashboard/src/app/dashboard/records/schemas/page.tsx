'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileJson, Plus, Copy, Check } from 'lucide-react';
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

interface SchemaRow {
  cid: string;
  name: string;
  dialect?: string;
  created_at?: string;
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

const DEFAULT_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

export default function SchemasPage() {
  const { toast } = useToast();

  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailSchema, setDetailSchema] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Upload form
  const [schemaName, setSchemaName] = useState('');
  const [dialect, setDialect] = useState(DEFAULT_DIALECT);
  const [schemaJson, setSchemaJson] = useState('{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "type": "object",\n  "properties": {}\n}');
  const [uploading, setUploading] = useState(false);

  const loadSchemas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.records.schemas.list();
      setSchemas(data.results ?? []);
    } catch {
      // stay empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemas();
  }, [loadSchemas]);

  const handleUpload = async () => {
    if (!schemaName.trim()) return;
    let schema: unknown;
    try {
      schema = JSON.parse(schemaJson);
    } catch {
      toast({ title: 'Invalid JSON schema', variant: 'error' });
      return;
    }
    setUploading(true);
    try {
      await api.records.schemas.create({ name: schemaName.trim(), schema, dialect });
      toast({ title: 'Schema uploaded', variant: 'success' });
      setUploadOpen(false);
      setSchemaName('');
      setSchemaJson('{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "type": "object",\n  "properties": {}\n}');
      await loadSchemas();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const openDetail = async (row: SchemaRow) => {
    try {
      const full = await api.records.schemas.get(row.cid);
      setDetailSchema(full);
      setDetailOpen(true);
    } catch {
      toast({ title: 'Failed to load schema', variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Schemas</h1>
          <p className="text-slate-600 dark:text-slate-400">
            JSON Schema definitions referenced by NDP collections and records.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
          Upload schema
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={48} rounded="lg" />)}
        </div>
      ) : schemas.length === 0 ? (
        <EmptyState
          icon={<FileJson className="w-12 h-12" />}
          title="No schemas yet"
          description="Upload a JSON Schema to validate records and enable typed collections."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
              Upload schema
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>CID</Th>
              <Th>Dialect</Th>
              <Th>Created</Th>
            </Tr>
          </THead>
          <TBody>
            {schemas.map((s) => (
              <Tr
                key={s.cid}
                className="cursor-pointer"
                onClick={() => openDetail(s)}
              >
                <Td className="font-medium text-slate-900 dark:text-slate-100">{s.name}</Td>
                <Td><CidCell cid={s.cid} /></Td>
                <Td className="text-xs text-slate-500">{s.dialect ?? DEFAULT_DIALECT}</Td>
                <Td className="text-xs text-slate-500">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload schema"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!schemaName.trim()}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            placeholder="e.g. EventSchema"
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
          />
          <Select
            label="Dialect"
            value={dialect}
            onChange={(e) => setDialect(e.target.value)}
            options={[
              { value: 'https://json-schema.org/draft/2020-12/schema', label: 'JSON Schema 2020-12' },
              { value: 'https://json-schema.org/draft-07/schema', label: 'JSON Schema Draft-07' },
            ]}
          />
          <Textarea
            label="Schema (JSON)"
            required
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detailSchema?.name ?? 'Schema'}
        size="xl"
      >
        <pre className="text-xs font-mono overflow-auto max-h-96 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
          {JSON.stringify(detailSchema?.schema ?? detailSchema, null, 2)}
        </pre>
      </Modal>
    </div>
  );
}
