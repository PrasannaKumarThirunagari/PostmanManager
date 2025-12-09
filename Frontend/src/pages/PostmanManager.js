import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const PostmanManager = () => {
  const [collections, setCollections] = useState([]);
  const [environments, setEnvironments] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
      
      // Load environments for each collection
      const envs = {};
      try {
        const envResponse = await apiService.get('/api/environments');
        const allEnvs = envResponse.environments || [];
        
        // Group environments by API name (which matches collection id)
        for (const collection of response.collections || []) {
          const collectionEnvs = allEnvs
            .filter(env => env.api_name === collection.id)
            .map(env => ({
              id: env.id,
              name: env.name,
              displayName: env.name.replace(`${collection.id} - `, '')
            }));
          envs[collection.id] = collectionEnvs;
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
        // Set empty environments if loading fails
        for (const collection of response.collections || []) {
          envs[collection.id] = [];
        }
      }
      setEnvironments(envs);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    try {
      await apiService.delete(`/api/collections/${collectionId}`);
      setMessage({ type: 'success', text: 'Collection deleted successfully' });
      loadCollections();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete collection' });
    }
  };

  const handleDeleteEnvironment = async (collectionId, env) => {
    const envName = typeof env === 'string' ? env : env.displayName || env.name;
    const envId = typeof env === 'string' ? `${collectionId}-${env}` : env.id;
    
    if (!window.confirm(`Are you sure you want to delete the ${envName} environment?`)) {
      return;
    }

    try {
      await apiService.delete(`/api/environments/${envId}`);
      setMessage({ type: 'success', text: 'Environment deleted successfully' });
      loadCollections(); // Reload to update environment list
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete environment' });
    }
  };

  const handleDownloadCollection = async (collectionId) => {
    try {
      const response = await apiService.get(`/api/collections/${collectionId}/download`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${collectionId}.postman_collection.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to download collection' });
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Postman Manager</h1>
        <p className="text-slate-600">View and manage your Postman collections and environments</p>
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
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-collection"></i>
            Postman Collections
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading collections...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-collection text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No Postman collections found</p>
              <p className="text-sm text-slate-500 mt-1">Convert a Swagger file to create your first collection</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Collection Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Environments</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <i className="bi bi-collection text-green-600"></i>
                          </div>
                          <span className="font-medium text-slate-900">{collection.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {(collection.size / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {environments[collection.id]?.map((env) => (
                            <span
                              key={typeof env === 'string' ? env : env.id}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 cursor-pointer transition-colors"
                              onClick={() => handleDeleteEnvironment(collection.id, env)}
                              title="Click to delete"
                            >
                              {typeof env === 'string' ? env : env.displayName || env.name}
                              <i className="bi bi-x text-xs"></i>
                            </span>
                          ))}
                          {(!environments[collection.id] || environments[collection.id].length === 0) && (
                            <span className="text-slate-400 text-sm">No environments</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadCollection(collection.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 font-medium text-sm"
                          >
                            <i className="bi bi-download"></i>
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(collection.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 hover:text-red-800 transition-all duration-200 font-medium text-sm"
                          >
                            <i className="bi bi-trash"></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostmanManager;
