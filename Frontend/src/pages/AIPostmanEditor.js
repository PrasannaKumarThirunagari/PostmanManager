import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const AIPostmanEditor = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [generatedResults, setGeneratedResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      loadRequests();
    } else {
      setRequests([]);
      setSelectedRequests([]);
    }
  }, [selectedCollection]);

  const loadCollections = async () => {
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    }
  };

  const loadRequests = async () => {
    if (!selectedCollection) return;
    
    setLoading(true);
    try {
      const response = await apiService.get(`/api/collections/${selectedCollection}/requests`);
      // Flatten requests for display
      const flattened = flattenRequests(response.items || []);
      setRequests(flattened);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load requests' });
    } finally {
      setLoading(false);
    }
  };

  const flattenRequests = (items, path = '') => {
    const result = [];
    
    for (const item of items) {
      if (item.request) {
        // It's a request
        const requestName = item.name || '';
        const requestMethod = (item.request?.method || '').toUpperCase();
        const requestId = path ? `${path}::${requestName}::${requestMethod}` : `${requestName}::${requestMethod}`;
        
        result.push({
          id: requestId,
          name: requestName,
          method: requestMethod,
          path: path,
          fullPath: path ? `${path} > ${requestName}` : requestName,
          request: item
        });
      } else if (item.item && Array.isArray(item.item)) {
        // It's a folder - recurse
        const folderName = item.name || '';
        const newPath = path ? `${path}/${folderName}` : folderName;
        const nested = flattenRequests(item.item, newPath);
        result.push(...nested);
      }
    }
    
    return result;
  };

  const handleRequestToggle = (requestId) => {
    setSelectedRequests(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(r => r.id));
    }
  };

  const handleGenerate = async () => {
    if (!selectedCollection) {
      setMessage({ type: 'danger', text: 'Please select a collection' });
      return;
    }
    
    if (selectedRequests.length === 0) {
      setMessage({ type: 'danger', text: 'Please select at least one request' });
      return;
    }
    
    if (!prompt.trim()) {
      setMessage({ type: 'danger', text: 'Please enter a prompt' });
      return;
    }
    
    if (!openaiKey.trim()) {
      setMessage({ type: 'danger', text: 'Please enter your OpenAI API key' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    setGeneratedResults(null);

    try {
      const response = await apiService.post('/api/collections/ai-generate', {
        collection_id: selectedCollection,
        request_ids: selectedRequests,
        prompt: prompt.trim(),
        openai_api_key: openaiKey.trim()
      });

      setGeneratedResults(response);
      setMessage({ type: 'success', text: 'Requests generated successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: error.message || 'Failed to generate requests. Please check your OpenAI API key and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCollection = async () => {
    if (!generatedResults || !generatedResults.modified_requests) {
      setMessage({ type: 'danger', text: 'No generated results to save' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiService.post('/api/collections/ai-save', {
        collection_id: selectedCollection,
        modified_requests: generatedResults.modified_requests
      });

      setMessage({ type: 'success', text: response.message || 'Collection saved successfully!' });
      // Reload requests to show updated collection
      await loadRequests();
      // Clear generated results after save
      setGeneratedResults(null);
      setSelectedRequests([]);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save collection' });
    } finally {
      setSaving(false);
    }
  };

  const getMessageStyles = (type) => {
    const baseStyles = "p-4 rounded-lg mb-6 border flex items-start gap-3";
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'danger':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">AI Postman Editor</h1>
        <p className="text-slate-600">Use AI to modify your Postman collection requests</p>
      </div>

      {message.text && (
        <div className={getMessageStyles(message.type)}>
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : message.type === 'danger' ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill'} text-xl flex-shrink-0`}></i>
          <div className="flex-1">
            <p className="font-medium">{message.text}</p>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      {/* Collection Selection */}
      <div className="card-modern">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-collection"></i>
            Select Collection
          </h2>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Postman Collection
            </label>
            <select
              className="select-modern"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">-- Select a collection --</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCollection && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary-modern"
              disabled={loading}
            >
              <i className="bi bi-list-check mr-2"></i>
              Select Requests ({selectedRequests.length} selected)
            </button>
          )}
        </div>
      </div>

      {/* Request Selection Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Select Requests</h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <i className="bi bi-x-lg text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-600">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600">No requests found in this collection</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedRequests.length === requests.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-slate-600">
                      {selectedRequests.length} of {requests.length} selected
                    </span>
                  </div>
                  <div className="space-y-2">
                    {requests.map((request) => (
                      <label
                        key={request.id}
                        className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={() => handleRequestToggle(request.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              request.method === 'GET' ? 'bg-green-100 text-green-700' :
                              request.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                              request.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                              request.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {request.method}
                            </span>
                            <span className="font-medium text-slate-900">{request.name}</span>
                          </div>
                          {request.path && (
                            <p className="text-sm text-slate-500 mt-1">{request.path}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="btn-secondary-modern"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                }}
                className="btn-primary-modern"
              >
                Done ({selectedRequests.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt and API Key */}
      {selectedCollection && selectedRequests.length > 0 && (
        <div className="card-modern">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="bi bi-robot"></i>
              AI Configuration
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                className="input-modern"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Your API key is sent directly to OpenAI and not stored
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prompt / Instructions
              </label>
              <textarea
                className="input-modern min-h-[150px] resize-y"
                placeholder="Enter your instructions for modifying the selected requests. For example: 'Add authentication headers to all requests' or 'Update the base URL to use https://api.example.com'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerate}
              className="btn-primary-modern w-full"
              disabled={loading || !prompt.trim() || !openaiKey.trim()}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-magic mr-2"></i>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Results */}
      {generatedResults && (
        <div className="card-modern">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="bi bi-check-circle"></i>
              Generated Results
            </h2>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-slate-700 mb-2">
                <strong>{generatedResults.modified_requests?.length || 0}</strong> requests have been modified.
              </p>
              <p className="text-sm text-slate-600">
                Review the changes below and click "Save Collection" to persist them to your Postman collection.
              </p>
            </div>

            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {generatedResults.modified_requests?.map((item, index) => {
                const requestId = item.request_id || '';
                const parts = requestId.split('::');
                const requestName = parts.length >= 2 ? parts[parts.length - 2] : requestId;
                const requestMethod = parts.length >= 1 ? parts[parts.length - 1] : '';
                
                return (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        requestMethod === 'GET' ? 'bg-green-100 text-green-700' :
                        requestMethod === 'POST' ? 'bg-blue-100 text-blue-700' :
                        requestMethod === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                        requestMethod === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {requestMethod}
                      </span>
                      <span className="font-medium text-slate-900">{requestName}</span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        View modified request
                      </summary>
                      <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(item.modified_request, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSaveCollection}
              className="btn-primary-modern w-full"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save mr-2"></i>
                  Save Collection
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPostmanEditor;

