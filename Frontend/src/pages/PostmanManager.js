import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';
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

  return (
    <div>
      <h2 className="mb-4">Postman Manager</h2>

      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Postman Collections</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-muted text-center">No Postman collections found</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Collection Name</th>
                  <th>Size</th>
                  <th>Environments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id}>
                    <td>{collection.name}</td>
                    <td>{(collection.size / 1024).toFixed(2)} KB</td>
                    <td>
                      {environments[collection.id]?.map((env) => (
                        <Badge
                          key={typeof env === 'string' ? env : env.id}
                          bg="secondary"
                          className="me-1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleDeleteEnvironment(collection.id, env)}
                        >
                          {typeof env === 'string' ? env : env.displayName || env.name}
                          <i className="bi bi-x ms-1"></i>
                        </Badge>
                      ))}
                      {(!environments[collection.id] || environments[collection.id].length === 0) && (
                        <span className="text-muted">No environments</span>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleDownloadCollection(collection.id)}
                      >
                        <i className="bi bi-download me-1"></i>
                        Download
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteCollection(collection.id)}
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

export default PostmanManager;
