import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const FilteringConditions = () => {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [formData, setFormData] = useState({
    dataType: 'string',
    key: '',
    value: '',
    enabled: true,
    description: ''
  });

  const dataTypes = ['string', 'number', 'integer', 'boolean', 'date', 'datetime'];

  useEffect(() => {
    loadConditions();
  }, []);

  const loadConditions = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/filtering-conditions');
      setConditions(response.conditions || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load conditions' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (condition = null) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        dataType: condition.dataType || 'string',
        key: condition.key || '',
        value: condition.value || '',
        enabled: condition.enabled !== undefined ? condition.enabled : true,
        description: condition.description || ''
      });
    } else {
      setEditingCondition(null);
      setFormData({
        dataType: 'string',
        key: '',
        value: '',
        enabled: true,
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCondition(null);
    setFormData({
      dataType: 'string',
      key: '',
      value: '',
      enabled: true,
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.key.trim()) {
      setMessage({ type: 'danger', text: 'Key is required' });
      return;
    }

    try {
      if (editingCondition) {
        // Update
        await apiService.put(`/api/filtering-conditions/${editingCondition.id}`, formData);
        setMessage({ type: 'success', text: 'Condition updated successfully' });
      } else {
        // Create
        await apiService.post('/api/filtering-conditions', formData);
        setMessage({ type: 'success', text: 'Condition created successfully' });
      }
      handleCloseModal();
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save condition' });
    }
  };

  const handleDelete = async (conditionId) => {
    if (!window.confirm('Are you sure you want to delete this condition?')) {
      return;
    }

    try {
      await apiService.delete(`/api/filtering-conditions/${conditionId}`);
      setMessage({ type: 'success', text: 'Condition deleted successfully' });
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete condition' });
    }
  };

  const handleToggle = async (conditionId) => {
    try {
      await apiService.patch(`/api/filtering-conditions/${conditionId}/toggle`);
      setMessage({ type: 'success', text: 'Condition status updated' });
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to toggle condition' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiService.get('/api/filtering-conditions/export');
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filtering_conditions_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Conditions exported successfully' });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to export conditions' });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await apiService.post('/api/filtering-conditions/import', data);
        setMessage({ type: 'success', text: 'Conditions imported successfully' });
        await loadConditions();
      } catch (error) {
        setMessage({ type: 'danger', text: error.message || 'Failed to import conditions' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  // Group conditions by dataType
  const groupedConditions = conditions.reduce((acc, condition) => {
    const dataType = condition.dataType || 'other';
    if (!acc[dataType]) {
      acc[dataType] = [];
    }
    acc[dataType].push(condition);
    return acc;
  }, {});

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Filtering Conditions</h1>
          <p className="text-slate-600">Manage filtering conditions master data</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary-modern flex items-center gap-2"
          >
            <i className="bi bi-download"></i>
            Export
          </button>
          <label className="btn-secondary-modern flex items-center gap-2 cursor-pointer">
            <i className="bi bi-upload"></i>
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary-modern flex items-center gap-2"
          >
            <i className="bi bi-plus-circle"></i>
            Add Condition
          </button>
        </div>
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

      {loading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-12 w-12 text-teal-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-600">Loading conditions...</p>
        </div>
      ) : (
        <div>
          {Object.keys(groupedConditions).length === 0 ? (
            <div className="card-modern text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-sliders text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No conditions found. Click "Add Condition" to create one.</p>
            </div>
          ) : (
            Object.keys(groupedConditions).map((dataType) => (
              <div key={dataType} className="card-modern mb-6">
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-semibold">
                      {dataType.toUpperCase()}
                    </span>
                    <span className="text-white/90">{groupedConditions[dataType].length} condition(s)</span>
                  </h2>
                </div>
                <div className="p-6">
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
                        {groupedConditions[dataType].map((condition) => (
                          <tr key={condition.id} className="hover:bg-slate-50 transition-colors duration-150">
                            <td className="px-4 py-4 font-semibold text-slate-900">{condition.key}</td>
                            <td className="px-4 py-4">
                              <code className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-800">
                                {condition.value || '(empty)'}
                              </code>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{condition.description || '-'}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                condition.enabled 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {condition.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenModal(condition)}
                                  className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  onClick={() => handleToggle(condition.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    condition.enabled
                                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                                  }`}
                                  title={condition.enabled ? 'Disable' : 'Enable'}
                                >
                                  <i className={`bi ${condition.enabled ? 'bi-toggle-off' : 'bi-toggle-on'}`}></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(condition.id)}
                                  className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                                  title="Delete"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingCondition ? 'Edit Condition' : 'Add New Condition'}</h2>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-slate-200 transition-colors"
              >
                <i className="bi bi-x-lg text-2xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Data Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.dataType}
                      onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                      required
                      className="select-modern"
                    >
                      {dataTypes.map((dt) => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Key (Condition Name) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      placeholder="e.g., EQ, NEQ, Contains"
                      required
                      className="input-modern"
                    />
                    <p className="mt-1 text-sm text-slate-500">
                      The condition identifier (e.g., EQ, NEQ, GT, LT, Contains)
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Value</label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., *{value}* for Contains, empty for EQ/NEQ"
                    className="input-modern"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    Filter value pattern. Use {"{value}"} as placeholder. Leave empty for exact match conditions.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description of what this condition does"
                    className="input-modern"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="enabled-check"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-5 h-5 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <label htmlFor="enabled-check" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Enabled
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary-modern"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-modern"
                >
                  {editingCondition ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilteringConditions;

