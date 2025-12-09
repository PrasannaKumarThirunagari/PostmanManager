import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert, Spinner } from 'react-bootstrap';
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

  return (
    <div>
      <h2 className="mb-4">Manage Swagger Files</h2>

      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Upload Swagger File</h5>
        </Card.Header>
        <Card.Body>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #dee2e6',
              borderRadius: '0.25rem',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
              {uploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-upload fs-1 d-block mb-2"></i>
                  <p className="mb-0">Drag and drop a Swagger file here, or click to select</p>
                  <small className="text-muted">Supports .json, .yaml, .yml files</small>
                </>
              )}
            </label>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h5 className="mb-0">Swagger Files</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : swaggerFiles.length === 0 ? (
            <p className="text-muted text-center">No Swagger files found</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {swaggerFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.name}</td>
                    <td>{(file.size / 1024).toFixed(2)} KB</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ManageSwagger;
