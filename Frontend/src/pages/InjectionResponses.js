import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const InjectionResponses = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [formData, setFormData] = useState({
    injection_type: 'xss',
    status_code: 400,
    message: '',
    enabled: true
  });

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/v1/injection-responses/');
      setResponses(response || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load injection responses' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingResponse(null);
    setFormData({
      injection_type: 'xss',
      status_code: 400,
      message: '',
      enabled: true
    });
    setShowModal(true);
  };

  const handleEdit = (response) => {
    setEditingResponse(response);
    setFormData({
      injection_type: response.injection_type,
      status_code: response.status_code,
      message: response.message,
      enabled: response.enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (responseId) => {
    if (!window.confirm('Are you sure you want to delete this injection response configuration?')) {
      return;
    }

    try {
      await apiService.delete(`/api/v1/injection-responses/${responseId}`);
      setMessage({ type: 'success', text: 'Injection response deleted successfully' });
      loadResponses();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete injection response' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.message) {
      setMessage({ type: 'warning', text: 'Please provide a response message' });
      return;
    }

    try {
      if (editingResponse) {
        await apiService.put(`/api/v1/injection-responses/${editingResponse.id}`, formData);
        setMessage({ type: 'success', text: 'Injection response updated successfully' });
      } else {
        await apiService.post('/api/v1/injection-responses/', formData);
        setMessage({ type: 'success', text: 'Injection response created successfully' });
      }
      setShowModal(false);
      loadResponses();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save injection response' });
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

  const getInjectionTypeLabel = (type) => {
    const labels = {
      'xss': 'XSS (Cross-Site Scripting)',
      'sql': 'SQL Injection',
      'html': 'HTML Injection'
    };
    return labels[type] || type.toUpperCase();
  };

  const getInjectionTypeColor = (type) => {
    const colors = {
      'xss': 'bg-red-100 text-red-800',
      'sql': 'bg-orange-100 text-orange-800',
      'html': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Injection Response Configurations</h1>
        <p className="text-gray-600">
          Configure 400 response messages for different injection types (XSS, SQL, HTML).
          These responses will be automatically added to injection variant requests in Postman collections.
        </p>
      </div>

      {message.text && (
        <div className={getMessageStyles(message.type)}>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Injection Response
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No injection response configurations found.</p>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Configuration
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Injection Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {responses.map((response) => (
                <tr key={response.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInjectionTypeColor(response.injection_type)}`}>
                      {getInjectionTypeLabel(response.injection_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{response.status_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={response.message}>
                      {response.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      response.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {response.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(response)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(response.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingResponse ? 'Edit Injection Response' : 'Create Injection Response'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Injection Type *
                </label>
                <select
                  value={formData.injection_type}
                  onChange={(e) => setFormData({ ...formData, injection_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="xss">XSS (Cross-Site Scripting)</option>
                  <option value="sql">SQL Injection</option>
                  <option value="html">HTML Injection</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the type of injection this response applies to
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Code *
                </label>
                <input
                  type="number"
                  value={formData.status_code}
                  onChange={(e) => setFormData({ ...formData, status_code: parseInt(e.target.value) || 400 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="100"
                  max="599"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  HTTP status code for the response (default: 400)
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                  placeholder="Enter the response message (e.g., 'XSS injection detected', 'Invalid SQL input', etc.)"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be included in the response body for injection variant requests
                </p>
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Enabled</span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Only enabled configurations will be used when generating Postman collections
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingResponse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InjectionResponses;

