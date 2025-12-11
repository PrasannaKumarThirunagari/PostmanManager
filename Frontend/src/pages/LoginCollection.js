import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const LoginCollection = () => {
  const [loginCollection, setLoginCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fileInput, setFileInput] = useState(null);

  useEffect(() => {
    loadLoginCollection();
  }, []);

  const loadLoginCollection = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/login-collection');
      if (response.exists) {
        setLoginCollection(response);
      } else {
        setLoginCollection(null);
      }
    } catch (error) {
      console.error('Failed to load login collection:', error);
      setLoginCollection(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setMessage({ type: 'warning', text: 'Please select a JSON file' });
        return;
      }
      setFileInput(file);
    }
  };

  const handleUpload = async () => {
    if (!fileInput) {
      setMessage({ type: 'warning', text: 'Please select a file to upload' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', fileInput);

      const response = await apiService.post('/api/login-collection/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ type: 'success', text: response.message || 'Login collection uploaded successfully' });
      setFileInput(null);
      // Reset file input
      const input = document.getElementById('file-input');
      if (input) {
        input.value = '';
      }
      loadLoginCollection();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to upload login collection' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the login collection? It will no longer be appended to converted collections.')) {
      return;
    }

    try {
      await apiService.delete('/api/login-collection');
      setMessage({ type: 'success', text: 'Login collection deleted successfully' });
      setLoginCollection(null);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete login collection' });
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Login Collection</h1>
        <p className="text-slate-600">Upload a Postman collection that will be appended to all converted collections in a "Login" folder</p>
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
            <i className="bi bi-key-fill"></i>
            Upload Login Collection
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading...</p>
            </div>
          ) : loginCollection ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-check-circle-fill text-green-600 text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Login Collection Uploaded</h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p><span className="font-medium">Name:</span> {loginCollection.name}</p>
                      <p><span className="font-medium">Items:</span> {loginCollection.item_count} request(s)</p>
                    </div>
                    <p className="mt-3 text-sm text-green-700">
                      This collection will be automatically appended to all converted Postman collections in a "Login" folder.
                      The collection will be used as-is without any dynamic variable modifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="btn-secondary-modern flex items-center gap-2"
                >
                  <i className="bi bi-trash"></i>
                  Delete Login Collection
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <p className="text-slate-700 mb-4">
                  No login collection has been uploaded yet. Upload a Postman collection file (.json) that contains your login/authentication requests.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Note:</strong> The login collection will be appended to every collection converted from Swagger to Postman.
                  It will be placed in a "Login" folder at the beginning of the collection. The collection will be used exactly as uploaded (no dynamic variables will be created).
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <i className="bi bi-file-earmark-code mr-2"></i>
              Select Postman Collection File (.json)
            </label>
            <div className="flex gap-3">
              <input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  file:cursor-pointer"
              />
            </div>
            {fileInput && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700">
                  <i className="bi bi-file-earmark-check text-green-600 mr-2"></i>
                  Selected: <span className="font-medium">{fileInput.name}</span> ({(fileInput.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={handleUpload}
                disabled={!fileInput || uploading}
                className="btn-primary-modern disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload"></i>
                    Upload Login Collection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginCollection;

