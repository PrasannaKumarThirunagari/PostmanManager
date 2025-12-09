import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const ManageSwagger = () => {
  const [swaggerFiles, setSwaggerFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSwaggerFiles();
  }, []);

  const loadSwaggerFiles = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/swagger/files');
      setSwaggerFiles(response.files || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load Swagger files' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await apiService.delete(`/api/swagger/files/${fileId}`);
      setMessage({ type: 'success', text: 'File deleted successfully' });
      loadSwaggerFiles();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete file' });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      await apiService.post('/api/swagger/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ type: 'success', text: 'File uploaded successfully' });
      loadSwaggerFiles();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to upload file' });
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      setUploading(true);
      setMessage({ type: '', text: '' });

      try {
        await apiService.post('/api/swagger/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setMessage({ type: 'success', text: 'File uploaded successfully' });
        loadSwaggerFiles();
      } catch (error) {
        setMessage({ type: 'danger', text: error.message || 'Failed to upload file' });
      } finally {
        setUploading(false);
      }
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Manage Swagger Files</h1>
        <p className="text-slate-600">Upload and manage your Swagger/OpenAPI specification files</p>
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

      <div className="card-modern mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-cloud-upload"></i>
            Upload Swagger File
          </h2>
        </div>
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300"
          >
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-lg font-medium text-slate-700">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <i className="bi bi-cloud-upload text-white text-4xl"></i>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-1">
                      Drag and drop a Swagger file here
                    </p>
                    <p className="text-sm text-slate-500 mb-2">or</p>
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to browse
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">Supports .json, .yaml, .yml files</p>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="card-modern">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-folder"></i>
            Swagger Files
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading files...</p>
            </div>
          ) : swaggerFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-folder-x text-slate-400 text-3xl"></i>
              </div>
              <p className="text-slate-600 font-medium">No Swagger files found</p>
              <p className="text-sm text-slate-500 mt-1">Upload your first Swagger file above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {swaggerFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i className="bi bi-file-earmark-code text-blue-600"></i>
                          </div>
                          <span className="font-medium text-slate-900">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 hover:text-red-800 transition-all duration-200 font-medium text-sm"
                        >
                          <i className="bi bi-trash"></i>
                          Delete
                        </button>
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

export default ManageSwagger;
