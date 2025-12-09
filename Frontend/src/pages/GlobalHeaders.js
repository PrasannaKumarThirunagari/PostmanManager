import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const GlobalHeaders = () => {
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingHeader, setEditingHeader] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    enabled: true
  });

  useEffect(() => {
    loadHeaders();
  }, []);

  const loadHeaders = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/global-headers/');
      setHeaders(response || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load global headers' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingHeader(null);
    setFormData({
      key: '',
      value: '',
      description: '',
      enabled: true
    });
    setShowModal(true);
  };

  const handleEdit = (header) => {
    setEditingHeader(header);
    setFormData({
      key: header.key,
      value: header.value,
      description: header.description || '',
      enabled: header.enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (headerId) => {
    if (!window.confirm('Are you sure you want to delete this header?')) {
      return;
    }

    try {
      await apiService.delete(`/api/global-headers/${headerId}`);
      setMessage({ type: 'success', text: 'Header deleted successfully' });
      loadHeaders();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete header' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.key || !formData.value) {
      setMessage({ type: 'warning', text: 'Please provide both key and value' });
      return;
    }

    try {
      if (editingHeader) {
        await apiService.put(`/api/global-headers/${editingHeader.id}`, formData);
        setMessage({ type: 'success', text: 'Header updated successfully' });
      } else {
        await apiService.post('/api/global-headers/', formData);
        setMessage({ type: 'success', text: 'Header created successfully' });
      }
      setShowModal(false);
      loadHeaders();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save header' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Global Headers Management</h1>
          <p className="text-slate-600">Manage global headers for API operations (Create, Read, Update, Delete)</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary-modern flex items-center gap-2"
        >
          <i className="bi bi-plus-circle"></i>
          Add Header
        </button>
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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-heading"></i>
            Global Headers
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading headers...</p>
            </div>
          ) : headers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-heading text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No global headers found</p>
              <p className="text-sm text-slate-500 mt-1">Create your first global header to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {headers.map((header) => (
                    <tr key={header.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{header.key}</span>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">{header.value}</code>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {header.description || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          header.enabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <i className={`bi ${header.enabled ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                          {header.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(header)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 font-medium text-sm"
                          >
                            <i className="bi bi-pencil"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(header.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-heading"></i>
                {editingHeader ? 'Edit Global Header' : 'Create Global Header'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Header Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., X-API-Key, Authorization"
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Header Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Enter header value"
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this header"
                  rows={3}
                  className="input-modern"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-slate-700">Enabled</label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-modern"
                >
                  {editingHeader ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalHeaders;

