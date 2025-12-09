import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const StatusScripts = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [formData, setFormData] = useState({
    status_code: '',
    script_type: 'test',
    script: '',
    description: '',
    enabled: true
  });

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/status-scripts/');
      setScripts(response || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load status scripts' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingScript(null);
    setFormData({
      status_code: '',
      script_type: 'test',
      script: '',
      description: '',
      enabled: true
    });
    setShowModal(true);
  };

  const handleEdit = (script) => {
    setEditingScript(script);
    setFormData({
      status_code: script.status_code,
      script_type: script.script_type,
      script: script.script,
      description: script.description || '',
      enabled: script.enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (scriptId) => {
    if (!window.confirm('Are you sure you want to delete this script?')) {
      return;
    }

    try {
      await apiService.delete(`/api/status-scripts/${scriptId}`);
      setMessage({ type: 'success', text: 'Script deleted successfully' });
      loadScripts();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete script' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.status_code || !formData.script) {
      setMessage({ type: 'warning', text: 'Please provide status code and script' });
      return;
    }

    try {
      if (editingScript) {
        await apiService.put(`/api/status-scripts/${editingScript.id}`, formData);
        setMessage({ type: 'success', text: 'Script updated successfully' });
      } else {
        await apiService.post('/api/status-scripts/', formData);
        setMessage({ type: 'success', text: 'Script created successfully' });
      }
      setShowModal(false);
      loadScripts();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save script' });
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

  // Group scripts by status code
  const groupedScripts = scripts.reduce((acc, script) => {
    if (!acc[script.status_code]) {
      acc[script.status_code] = [];
    }
    acc[script.status_code].push(script);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Status-Based Scripts Management</h1>
          <p className="text-slate-600">Manage scripts associated with different HTTP status codes</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary-modern flex items-center gap-2"
        >
          <i className="bi bi-plus-circle"></i>
          Add Script
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
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-code-slash"></i>
            Status Scripts
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading scripts...</p>
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-code-slash text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No status scripts found</p>
              <p className="text-sm text-slate-500 mt-1">Create your first status script to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedScripts).sort().map((statusCode) => (
                <div key={statusCode} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <i className="bi bi-123 text-orange-600"></i>
                      Status Code: {statusCode}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupedScripts[statusCode].map((script) => (
                      <div key={script.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                script.script_type === 'test' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                <i className={`bi ${script.script_type === 'test' ? 'bi-check-circle' : 'bi-play-circle'}`}></i>
                                {script.script_type === 'pre-request' ? 'Pre-Request' : 'Test'} Script
                              </span>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                script.enabled 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                <i className={`bi ${script.enabled ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                                {script.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            {script.description && (
                              <p className="text-sm text-slate-600 mb-2">{script.description}</p>
                            )}
                            <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto max-h-32">
                              <code className="text-slate-700">{script.script}</code>
                            </pre>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(script)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 font-medium text-sm"
                            >
                              <i className="bi bi-pencil"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(script.id)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 hover:text-red-800 transition-all duration-200 font-medium text-sm"
                            >
                              <i className="bi bi-trash"></i>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-code-slash"></i>
                {editingScript ? 'Edit Status Script' : 'Create Status Script'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.status_code}
                  onChange={(e) => setFormData({ ...formData, status_code: e.target.value })}
                  placeholder="e.g., 200, 404, 500, 2XX, 4XX"
                  className="input-modern"
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  Enter HTTP status code (e.g., 200, 404, 500) or range (e.g., 2XX, 4XX)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Script Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.script_type}
                  onChange={(e) => setFormData({ ...formData, script_type: e.target.value })}
                  className="select-modern"
                  required
                >
                  <option value="test">Test Script (runs after response)</option>
                  <option value="pre-request">Pre-Request Script (runs before request)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Script <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.script}
                  onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                  placeholder="Enter JavaScript code for the script"
                  rows={12}
                  className="input-modern font-mono text-sm"
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  JavaScript code that will run for requests with this status code
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this script"
                  rows={2}
                  className="input-modern"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-5 h-5 text-orange-600 border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
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
                  {editingScript ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusScripts;

