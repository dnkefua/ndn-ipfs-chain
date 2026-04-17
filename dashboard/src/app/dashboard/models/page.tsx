'use client';

import { useState, useEffect } from 'react';

interface HFModel {
  id: string;
  author: string;
  sha: string;
  lastModified: string;
  private: boolean;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  createdAt?: string;
  siblings?: { rfilename: string }[];
  modelId?: string;
}

interface HFModelDetails {
  id: string;
  author: string;
  sha: string;
  lastModified: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  private: boolean;
  cardData?: string;
  files?: { path: string; size: number }[];
}

interface ImportedModel {
  id: string;
  name: string;
  version: string;
  root_cid: string;
  source: string;
  status: 'importing' | 'ready' | 'failed';
  created_at: string;
}

interface CartItem {
  model: HFModel;
  selected: boolean;
}

const TASK_TYPES = [
  { value: '', label: 'All Tasks' },
  { value: 'text-generation', label: 'Text Generation' },
  { value: 'chat-completion', label: 'Chat Completion' },
  { value: 'text-to-image', label: 'Text to Image' },
  { value: 'image-to-text', label: 'Image to Text' },
  { value: 'automatic-speech-recognition', label: 'Speech Recognition' },
  { value: 'text-to-speech', label: 'Text to Speech' },
  { value: 'translation', label: 'Translation' },
  { value: 'feature-extraction', label: 'Feature Extraction' },
];

export default function ModelsPage() {
  const [view, setView] = useState<'browse' | 'imported' | 'cart'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [hfModels, setHfModels] = useState<HFModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModel, setDetailsModel] = useState<HFModelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_HF_API_KEY || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [importedModels, setImportedModels] = useState<ImportedModel[]>([
    { id: '1', name: 'meta-llama/Llama-3-8B-Instruct', version: 'latest', root_cid: 'bafybeihqw7w5vws7ud3', source: 'huggingface', status: 'ready', created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);

  const fetchModels = async (query: string = '', task: string = '') => {
    setLoading(true);
    try {
      let url = `https://huggingface.co/api/models?sort=downloads&direction=-1&limit=48`;
      if (query) url += `&search=${encodeURIComponent(query)}`;
      if (task) url += `&pipeline_tag=${task}`;

      const headers: HeadersInit = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(url, { headers });
      const data = await response.json();
      setHfModels(Array.isArray(data) ? data.slice(0, 48) : []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setHfModels([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchModels(searchQuery, taskFilter);
  };

  const fetchModelDetails = async (modelId: string) => {
    setDetailsLoading(true);
    try {
      const headers: HeadersInit = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      // Fetch model info and README in parallel
      const [infoRes, cardRes, filesRes] = await Promise.all([
        fetch(`https://huggingface.co/api/models/${modelId}`, { headers }),
        fetch(`https://huggingface.co/api/models/${modelId}/card`, { headers }),
        fetch(`https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`, { headers }),
      ]);

      const infoData = await infoRes.json();
      const cardText = await cardRes.text();
      const filesData = await filesRes.json();

      const files = Array.isArray(filesData) ? filesData.slice(0, 20).map((f: any) => ({
        path: f.path,
        size: f.size || 0,
      })) : [];

      setDetailsModel({
        ...infoData,
        cardData: cardText.slice(0, 3000),
        files,
      });
    } catch (error) {
      console.error('Failed to fetch model details:', error);
      setDetailsModel(null);
    }
    setDetailsLoading(false);
  };

  const openDetails = (model: HFModel) => {
    setShowDetailsModal(true);
    setDetailsModel(null);
    fetchModelDetails(model.id);
  };

  const toggleCartItem = (model: HFModel) => {
    setCart(prev => {
      const exists = prev.find(item => item.model.id === model.id);
      if (exists) {
        return prev.filter(item => item.model.id !== model.id);
      }
      return [...prev, { model, selected: true }];
    });
  };

  const isInCart = (modelId: string) => cart.some(item => item.model.id === modelId);

  const handleImportSelected = async () => {
    const selectedItems = cart.filter(item => item.selected);
    for (const item of selectedItems) {
      const newModel: ImportedModel = {
        id: Date.now().toString() + item.model.id,
        name: item.model.id,
        version: 'latest',
        root_cid: 'importing...',
        source: 'huggingface',
        status: 'importing',
        created_at: new Date().toISOString(),
      };
      setImportedModels(prev => [newModel, ...prev]);
    }
    setCart([]);
    setView('imported');

    setTimeout(() => {
      setImportedModels(prev =>
        prev.map(m => m.status === 'importing' ? { ...m, status: 'ready', root_cid: `bafybe${m.name.replace('/', '').slice(0, 20)}` } : m)
      );
    }, 3000);
  };

  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`;
    return downloads.toString();
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getModelOwner = (modelId: string) => {
    const parts = modelId.split('/');
    return parts.length > 1 ? parts[0] : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">AI Models</h2>
          <p className="text-slate-600 mt-2">Browse and import HuggingFace models to IPFS</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="btn-secondary"
          >
            {apiKey ? '✓ API Key Set' : 'Set HF API Key'}
          </button>
          {cart.length > 0 && (
            <button
              onClick={() => setView('cart')}
              className="btn-primary relative"
            >
              Cart ({cart.length})
            </button>
          )}
        </div>
      </div>

      {showApiKeyInput && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">HuggingFace API Key</h3>
          <div className="flex gap-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1"
            />
            <button onClick={() => { fetchModels(); setShowApiKeyInput(false); }} className="btn-primary">
              Save & Fetch
            </button>
            <button onClick={() => setShowApiKeyInput(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Get your API key from <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-brand-600">huggingface.co/settings/tokens</a>
          </p>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setView('browse')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'browse' ? 'text-brand-600 border-brand-600' : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Browse Models
        </button>
        <button
          onClick={() => setView('cart')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'cart' ? 'text-brand-600 border-brand-600' : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Cart ({cart.length})
        </button>
        <button
          onClick={() => setView('imported')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            view === 'imported' ? 'text-brand-600 border-brand-600' : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Imported ({importedModels.length})
        </button>
      </div>

      {view === 'browse' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models (e.g., llama, stable diffusion, gpt)..."
              className="flex-1"
            />
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="w-48"
            >
              {TASK_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>

          <div className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${hfModels.length} models loaded`}
            {!apiKey && ' — Set your HF API key to access all models'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {hfModels.map((model) => (
              <div key={model.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate" title={model.id}>
                      {model.id.split('/')[1] || model.id}
                    </h3>
                    <p className="text-sm text-slate-500 truncate" title={model.author || getModelOwner(model.id)}>
                      by {model.author || getModelOwner(model.id)}
                    </p>
                  </div>
                  {isInCart(model.id) && (
                    <span className="bg-brand-100 text-brand-600 text-xs px-2 py-1 rounded-full">In Cart</span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Downloads</span>
                    <span className="font-medium text-brand-600">{formatDownloads(model.downloads)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Likes</span>
                    <span className="font-medium text-pink-600">{formatDownloads(model.likes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Task</span>
                    <span className="font-medium text-slate-700">{model.pipeline_tag || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openDetails(model)}
                    className="flex-1 btn-secondary text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => toggleCartItem(model)}
                    className={`flex-1 text-sm ${isInCart(model.id) ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {isInCart(model.id) ? 'Remove' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hfModels.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-600">
              {apiKey ? 'No models found. Try a different search.' : 'Set your HuggingFace API key to browse models.'}
            </div>
          )}
        </>
      )}

      {view === 'cart' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Selected Models ({cart.length})</h3>
            {cart.length > 0 && (
              <button onClick={handleImportSelected} className="btn-primary">
                Import {cart.length} Model{cart.length > 1 ? 's' : ''} to IPFS
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No models selected. Browse models and click "Select" to add to cart.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cart.map((item) => (
                <div key={item.model.id} className="card border-2 border-brand-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate" title={item.model.id}>
                        {item.model.id.split('/')[1] || item.model.id}
                      </h3>
                      <p className="text-sm text-slate-500 truncate" title={item.model.author || getModelOwner(item.model.id)}>
                        by {item.model.author || getModelOwner(item.model.id)}
                      </p>
                    </div>
                    <span className="bg-brand-100 text-brand-600 text-xs px-2 py-1 rounded-full">✓</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Downloads</span>
                      <span className="font-medium">{formatDownloads(item.model.downloads)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Likes</span>
                      <span className="font-medium">{formatDownloads(item.model.likes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Task</span>
                      <span className="font-medium">{item.model.pipeline_tag || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetails(item.model)}
                      className="flex-1 btn-secondary text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => toggleCartItem(item.model)}
                      className="flex-1 btn-secondary text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'imported' && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Your Imported Models</h3>
          {importedModels.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No models imported yet. Select models from browse and import.
            </div>
          ) : (
            <div className="space-y-4">
              {importedModels.map((model) => (
                <div key={model.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{model.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                        <span>CID: <code className="bg-slate-100 px-1 rounded">{model.root_cid}</code></span>
                      </div>
                    </div>
                    <span className={`badge ${
                      model.status === 'ready' ? 'badge-success' :
                      model.status === 'importing' ? 'badge-warning' : 'badge-error'
                    }`}>
                      {model.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
              {detailsModel ? (
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{detailsModel.id.split('/')[1] || detailsModel.id}</h2>
                    <p className="text-slate-500">by {detailsModel.author}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {detailsLoading && !detailsModel && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-20"></div>
                    ))}
                  </div>
                  <div className="animate-pulse bg-slate-100 rounded h-32"></div>
                </div>
              )}

              {detailsModel && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-brand-600">{formatDownloads(detailsModel.downloads)}</div>
                      <div className="text-sm text-slate-500">Downloads</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-pink-600">{formatDownloads(detailsModel.likes)}</div>
                      <div className="text-sm text-slate-500">Likes</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-slate-700">{detailsModel.pipeline_tag || 'N/A'}</div>
                      <div className="text-sm text-slate-500">Task Type</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-slate-700">{new Date(detailsModel.lastModified).toLocaleDateString()}</div>
                      <div className="text-sm text-slate-500">Last Updated</div>
                    </div>
                  </div>

                  {detailsModel.cardData && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Model Description</h3>
                      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {detailsModel.cardData}
                      </div>
                    </div>
                  )}

                  {detailsModel.files && detailsModel.files.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Files ({detailsModel.files.length})</h3>
                      <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {detailsModel.files.map((file, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-0">
                            <span className="font-mono text-slate-700 truncate">{file.path}</span>
                            <span className="text-slate-500 ml-4">{formatSize(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailsModel.tags?.map((tag) => (
                        <span key={tag} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                          {tag}
                        </span>
                      )) || <span className="text-slate-500">No tags</span>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Model SHA</h3>
                    <code className="bg-slate-100 px-3 py-2 rounded block text-sm text-slate-700 break-all">{detailsModel.sha}</code>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => {
                        const model = hfModels.find(m => m.id === detailsModel.id) || { id: detailsModel.id, author: detailsModel.author, sha: detailsModel.sha, lastModified: detailsModel.lastModified, private: detailsModel.private, downloads: detailsModel.downloads, likes: detailsModel.likes, tags: detailsModel.tags || [], pipeline_tag: detailsModel.pipeline_tag };
                        toggleCartItem(model as HFModel);
                        setShowDetailsModal(false);
                      }}
                      disabled={isInCart(detailsModel.id)}
                      className={`flex-1 ${isInCart(detailsModel.id) ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {isInCart(detailsModel.id) ? 'Already in Cart' : 'Add to Cart'}
                    </button>
                    <button onClick={() => setShowDetailsModal(false)} className="btn-secondary">
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
