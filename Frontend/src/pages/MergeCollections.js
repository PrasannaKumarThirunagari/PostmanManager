import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';

const MergeCollections = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [mergedCollectionName, setMergedCollectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleToggleCollection = (collectionId) => {
    setSelectedCollections(prev => {
      if (prev.includes(collectionId)) {
        return prev.filter(id => id !== collectionId);
      } else {
        return [...prev, collectionId];
      }
    });
  };

  const handleMerge = async () => {
    if (selectedCollections.length < 2) {
      setMessage({ type: 'warning', text: 'Please select at least 2 collections to merge' });
      return;
    }

    if (!mergedCollectionName || !mergedCollectionName.trim()) {
      setMessage({ type: 'warning', text: 'Please enter a name for the merged collection' });
      return;
    }

    setMerging(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiService.post('/api/collections/merge', {
        collection_ids: selectedCollections,
        merged_collection_name: mergedCollectionName.trim()
      });

      setMessage({ 
        type: 'success', 
        text: `Collections merged successfully! Created "${response.name}" with ${response.folders_count} folders.` 
      });
      
      // Reset form
      setSelectedCollections([]);
      setMergedCollectionName('');
      
      // Reload collections to show the new merged collection
      await loadCollections();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to merge collections' });
    } finally {
      setMerging(false);
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Merge Collections</h1>
        <p className="text-slate-600">Combine multiple Postman collections into one. Requests will be grouped by name (same as conversion flow).</p>
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

      <div className="card-modern">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-diagram-3"></i>
            Select Collections to Merge
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-100">
              <i className="bi bi-info-circle text-blue-600 text-4xl mb-4"></i>
              <p className="text-blue-800 font-medium">No collections found. Create collections first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                <p className="text-sm text-slate-700 mb-2">
                  <strong>Selected:</strong> {selectedCollections.length} collection(s)
                </p>
                <p className="text-xs text-slate-600">
                  Select at least 2 collections to merge. Requests will be grouped by name, and duplicates will be renamed with collection name suffix.
                </p>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className={`flex items-center gap-3 p-4 bg-white border-2 rounded-lg cursor-pointer hover:border-purple-300 transition-all duration-200 ${
                      selectedCollections.includes(collection.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollections.includes(collection.id)}
                      onChange={() => handleToggleCollection(collection.id)}
                      className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900">{collection.name}</span>
                      <p className="text-xs text-slate-500 mt-1">ID: {collection.id}</p>
                    </div>
                    {selectedCollections.includes(collection.id) && (
                      <i className="bi bi-check-circle-fill text-purple-600 text-xl"></i>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card-modern">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-file-earmark-plus"></i>
            Merged Collection Details
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Merged Collection Name *
            </label>
            <input
              type="text"
              value={mergedCollectionName}
              onChange={(e) => setMergedCollectionName(e.target.value)}
              placeholder="e.g., Merged API Collection"
              className="input-modern"
            />
            <p className="mt-1 text-sm text-slate-500">
              Enter a name for the merged collection. This will create a new collection.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <i className="bi bi-info-circle"></i>
              Merge Behavior
            </h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>All requests from selected collections will be combined</li>
              <li>Requests will be grouped by name (same as Swagger conversion flow)</li>
              <li>Duplicate requests (same name and method) will be renamed with collection name suffix</li>
              <li>Injection folders (XSS-Injections, SQL-Injections, HTML-Injections) will be preserved</li>
              <li>A new collection will be created with the specified name</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleMerge}
              disabled={merging || selectedCollections.length < 2 || !mergedCollectionName.trim()}
              className="btn-primary-modern disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {merging ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Merging...
                </>
              ) : (
                <>
                  <i className="bi bi-diagram-3"></i>
                  Merge Collections
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeCollections;

