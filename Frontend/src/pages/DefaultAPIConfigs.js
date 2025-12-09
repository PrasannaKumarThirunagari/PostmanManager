import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const DefaultAPIConfigs = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    api_name: '',
    environment: 'dev',
    variables: {},
    description: '',
    enabled: true
  });
  const [newVariable, setNewVariable] = useState({ key: '', value: '' });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/default-api-configs/');
      setConfigs(response || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load default API configs' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      api_name: '',
      environment: 'dev',
      variables: {},
      description: '',
      enabled: true
    });
    setNewVariable({ key: '', value: '' });
    setShowModal(true);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      api_name: config.api_name,
      environment: config.environment,
      variables: { ...config.variables },
      description: config.description || '',
      enabled: config.enabled
    });
    setNewVariable({ key: '', value: '' });
    setShowModal(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await apiService.delete(`/api/default-api-configs/${configId}`);
      setMessage({ type: 'success', text: 'Configuration deleted successfully' });
      loadConfigs();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete configuration' });
    }
  };

  const handleAddVariable = () => {
    if (!newVariable.key || !newVariable.value) {
      setMessage({ type: 'warning', text: 'Please provide both key and value for the variable' });
      return;
    }

    setFormData({
      ...formData,
      variables: {
        ...formData.variables,
        [newVariable.key]: newVariable.value
      }
    });
    setNewVariable({ key: '', value: '' });
  };

  const handleRemoveVariable = (key) => {
    const newVariables = { ...formData.variables };
    delete newVariables[key];
    setFormData({
      ...formData,
      variables: newVariables
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.api_name || !formData.environment) {
      setMessage({ type: 'warning', text: 'Please provide API name and environment' });
      return;
    }

    try {
      if (editingConfig) {
        await apiService.put(`/api/default-api-configs/${editingConfig.id}`, formData);
        setMessage({ type: 'success', text: 'Configuration updated successfully' });
      } else {
        await apiService.post('/api/default-api-configs/', formData);
        setMessage({ type: 'success', text: 'Configuration created successfully' });
      }
      setShowModal(false);
      loadConfigs();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save configuration' });
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

  const environmentOptions = [
    { value: 'local', label: 'Local' },
    { value: 'dev', label: 'Development' },
    { value: 'qa', label: 'QA' },
    { value: 'uat', label: 'UAT' },
    { value: 'prod', label: 'Production' }
  ];

  // Group configs by API name
  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.api_name]) {
      acc[config.api_name] = [];
    }
    acc[config.api_name].push(config);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Default API Configuration Variables</h1>
          <p className="text-slate-600">Manage default values that will be used when generating environment variables</p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-primary-modern flex items-center gap-2"
        >
          <i className="bi bi-plus-circle"></i>
          Add Configuration
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
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-gear-fill"></i>
            Default API Configurations
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-cyan-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading configurations...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-gear-fill text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No default API configurations found</p>
              <p className="text-sm text-slate-500 mt-1">Create your first configuration to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedConfigs).sort().map((apiName) => (
                <div key={apiName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <i className="bi bi-code-square text-cyan-600"></i>
                      API: {apiName}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupedConfigs[apiName].map((config) => (
                      <div key={config.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                                <i className="bi bi-globe"></i>
                                {environmentOptions.find(e => e.value === config.environment)?.label || config.environment}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                config.enabled 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                <i className={`bi ${config.enabled ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                                {config.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            {config.description && (
                              <p className="text-sm text-slate-600 mb-3">{config.description}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {Object.entries(config.variables).map(([key, value]) => (
                                <div key={key} className="bg-slate-100 rounded-lg p-2">
                                  <div className="text-xs font-medium text-slate-500 mb-1">{key}</div>
                                  <div className="text-sm text-slate-700 font-mono truncate">{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(config)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 font-medium text-sm"
                            >
                              <i className="bi bi-pencil"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(config.id)}
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
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-gear-fill"></i>
                {editingConfig ? 'Edit Default API Configuration' : 'Create Default API Configuration'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    API Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.api_name}
                    onChange={(e) => setFormData({ ...formData, api_name: e.target.value })}
                    placeholder="e.g., example-api, flutesapi"
                    className="input-modern"
                    required
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    Must match the API name used in Swagger conversion
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Environment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="select-modern"
                    required
                  >
                    {environmentOptions.map((env) => (
                      <option key={env.value} value={env.value}>
                        {env.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this configuration"
                  rows={2}
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Variables
                </label>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVariable.key}
                      onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
                      placeholder="Variable key (e.g., baseUrl, apiKey)"
                      className="input-modern flex-1"
                    />
                    <input
                      type="text"
                      value={newVariable.value}
                      onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                      placeholder="Variable value"
                      className="input-modern flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all duration-200 font-medium"
                    >
                      <i className="bi bi-plus"></i> Add
                    </button>
                  </div>
                  
                  {Object.keys(formData.variables).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(formData.variables).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-700">{key}</span>
                            <span className="text-sm text-slate-500 ml-2">=</span>
                            <span className="text-sm text-slate-700 ml-2 font-mono">{value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariable(key)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-5 h-5 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500"
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
                  {editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefaultAPIConfigs;

