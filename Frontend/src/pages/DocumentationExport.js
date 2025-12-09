import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';
import axios from 'axios';
import API_CONFIG from '../config/api.config';

const DocumentationExport = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [options, setOptions] = useState({
    include_xss: true,
    include_sql: true,
    include_html: true,
    include_requests: true,
    include_responses: true,
    include_headers: true,
    include_body: true,
  });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/documentation/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCollection) {
      setMessage({ type: 'warning', text: 'Please select a Postman collection' });
      return;
    }

    setExporting(true);
    setMessage({ type: '', text: '' });

    try {
      // Use axios directly for blob response to access headers
      const response = await axios.post(
        `${API_CONFIG.baseURL}/api/documentation/export`,
        {
          collection_id: selectedCollection,
          ...options
        },
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      let filename = 'API_Documentation.docx';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        // Fallback: use collection name if available
        const selectedCollectionData = collections.find(c => c.id === selectedCollection);
        if (selectedCollectionData) {
          filename = `${selectedCollectionData.name}_Documentation.docx`;
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Documentation exported successfully!' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export documentation';
      setMessage({ type: 'danger', text: errorMessage });
    } finally {
      setExporting(false);
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Documentation Export</h1>
        <p className="text-slate-600">Export Postman collections to Microsoft Word format with customizable options</p>
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
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-file-earmark-word"></i>
            Export Documentation
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <i className="bi bi-collection mr-2"></i>Select Postman Collection
            </label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="select-modern"
              disabled={loading}
            >
              <option value="">-- Select a collection --</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            {selectedCollection && (
              <p className="mt-2 text-sm text-slate-500">
                {collections.find(c => c.id === selectedCollection)?.description || ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <i className="bi bi-sliders mr-2"></i>Include/Exclude Options
            </label>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_requests}
                    onChange={(e) => setOptions({ ...options, include_requests: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-arrow-right-circle text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include Requests</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_responses}
                    onChange={(e) => setOptions({ ...options, include_responses: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-arrow-left-circle text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include Responses</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_headers}
                    onChange={(e) => setOptions({ ...options, include_headers: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-heading text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include Headers</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_body}
                    onChange={(e) => setOptions({ ...options, include_body: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-file-text text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include Body</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_xss}
                    onChange={(e) => setOptions({ ...options, include_xss: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-bug text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include XSS Injections</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_sql}
                    onChange={(e) => setOptions({ ...options, include_sql: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-database-exclamation text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include SQL Injections</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-teal-300 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={options.include_html}
                    onChange={(e) => setOptions({ ...options, include_html: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className="bi bi-code-square text-slate-600"></i>
                    <span className="text-sm font-medium text-slate-700">Include HTML Injections</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleExport}
              disabled={exporting || !selectedCollection || loading}
              className="btn-primary-modern disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-word"></i>
                  Export to Word
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationExport;

