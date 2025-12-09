import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Table, Modal } from 'react-bootstrap';
import apiService from '../services/api.service';

const CollectionEditor = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionItems, setCollectionItems] = useState([]); // Filtered items for display only
  const [fullCollection, setFullCollection] = useState(null); // Full collection structure with all injections
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    headers: '',
    body: '',
    description: ''
  });

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollectionId) {
      loadCollectionRequests();
    } else {
      setCollectionItems([]);
    }
  }, [selectedCollectionId]);

  const loadCollections = async () => {
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    }
  };

  const loadCollectionRequests = async () => {
    if (!selectedCollectionId) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Load the full collection (with all injections) - this is our working copy
      const fullResponse = await apiService.get(`/api/collections/${selectedCollectionId}/full`);
      
      // Reconstruct the full collection structure for saving
      const fullCollectionData = {
        info: fullResponse.collection_info || {},
        item: fullResponse.items || []
      };
      setFullCollection(fullCollectionData);
      
      // Load filtered requests for display only
      const filteredResponse = await apiService.get(`/api/collections/${selectedCollectionId}/requests`);
      const allRequests = flattenItems(filteredResponse.items || []);
      setCollectionItems(allRequests);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collection' });
    } finally {
      setLoading(false);
    }
  };

  const flattenItems = (items, parentPath = '', folderStructure = null, parentFolderName = '') => {
    const requests = [];
    items.forEach((item, index) => {
      const currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
      
      if (item.request) {
        // It's a request - create a unique identifier for finding it in the full collection
        // Use: parentFolderName + requestName + method as the unique key
        const uniqueKey = `${parentFolderName}|||${item.name}|||${item.request?.method || ''}`;
        requests.push({
          ...item,
          id: uniqueKey, // Use unique key instead of path-based ID
          path: currentPath,
          parentPath: parentPath,
          parentFolderName: parentFolderName,
          folderReference: folderStructure || item
        });
      } else if (item.item && Array.isArray(item.item)) {
        // It's a folder, recursively get requests - pass the folder name as parentFolderName
        const folderRequests = flattenItems(item.item, currentPath, item, item.name);
        requests.push(...folderRequests);
      }
    });
    return requests;
  };
  
  // Helper to find a request in the full collection structure by unique key
  const findRequestInCollection = (items, uniqueKey) => {
    const parts = uniqueKey.split('|||');
    if (parts.length !== 3) {
      console.error('Invalid unique key format:', uniqueKey);
      return null;
    }
    
    const [parentFolderName, requestName, method] = parts;
    const methodUpper = (method || '').toUpperCase();
    
    console.log('Searching for request:', { parentFolderName, requestName, method, methodUpper });
    
    // If no parent folder name, search for root-level request
    if (!parentFolderName || parentFolderName === '') {
      for (const item of items) {
        const itemMethod = (item.request?.method || '').toUpperCase();
        if (item.request && item.name === requestName && itemMethod === methodUpper) {
          console.log('Found root-level request');
          return { item: item, parentFolder: null };
        }
      }
      console.log('Root-level request not found');
      return null;
    }
    
    // First, try to find by folder name (preferred method)
    const findFolder = (items, depth = 0) => {
      for (const item of items) {
        if (item.item && Array.isArray(item.item)) {
          // Check if this is the target folder
          if (item.name === parentFolderName) {
            console.log(`Found target folder "${parentFolderName}" at depth ${depth}, items count: ${item.item.length}`);
            // Found the folder - search for request inside it
            for (const subItem of item.item) {
              const subItemMethod = (subItem.request?.method || '').toUpperCase();
              if (subItem.request && subItem.name === requestName && subItemMethod === methodUpper) {
                console.log('Found request in folder');
                return { item: subItem, parentFolder: item };
              }
            }
            console.log(`Folder "${parentFolderName}" found but request "${requestName}" (method: ${methodUpper}) not in it. Available items:`, 
              item.item.map(i => ({ name: i.name, hasRequest: !!i.request, method: i.request?.method })));
            // Folder found but request not in it - return null to try fallback search
            return null;
          }
          // Recursively search in nested folders
          const found = findFolder(item.item, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };
    
    let result = findFolder(items);
    
    // Fallback: If folder-based search fails, try finding by name+method anywhere
    // This handles cases where folder structure might differ
    if (!result) {
      console.log('Folder-based search failed, trying fallback search by name+method');
      const findByNameAndMethod = (items, parentFolder = null) => {
        for (const item of items) {
          if (item.item && Array.isArray(item.item)) {
            // It's a folder - recurse into it
            const found = findByNameAndMethod(item.item, item);
            if (found) return found;
          } else if (item.request) {
            // It's a request - check if it matches
            const itemMethod = (item.request?.method || '').toUpperCase();
            if (item.name === requestName && itemMethod === methodUpper) {
              // Check if parent folder name matches (if we have one)
              if (parentFolder && parentFolder.name === parentFolderName) {
                console.log('Found request via fallback search');
                return { item: item, parentFolder: parentFolder };
              }
            }
          }
        }
        return null;
      };
      
      result = findByNameAndMethod(items);
    }
    
    if (!result) {
      console.log('Request not found in collection structure');
    }
    return result;
  };

  const handleEdit = (request) => {
    if (!request || !request.request) {
      setMessage({ type: 'warning', text: 'Invalid request selected' });
      return;
    }
    
    try {
      const headers = request.request?.header || [];
      const body = request.request?.body || {};
      const description = request.request?.description || '';
      
      setEditingRequest(request);
      setEditFormData({
        headers: JSON.stringify(headers, null, 2),
        body: body.raw || (body ? JSON.stringify(body, null, 2) : ''),
        description: description || ''
      });
      setShowEditModal(true);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load request for editing' });
    }
  };

  const handleSaveEdit = () => {
    if (!editingRequest || !fullCollection) return;

    try {
      // Parse and update headers
      let headers = [];
      try {
        headers = JSON.parse(editFormData.headers);
        if (!Array.isArray(headers)) {
          throw new Error('Headers must be an array');
        }
      } catch (e) {
        setMessage({ type: 'danger', text: 'Invalid JSON format in headers. Must be a valid JSON array.' });
        return;
      }
      
      // Find the request in the full collection structure
      const found = findRequestInCollection(fullCollection.items || [], editingRequest.id);
      if (!found || !found.item) {
        setMessage({ type: 'danger', text: 'Request not found in collection' });
        return;
      }
      
      // Update the request directly in the full collection
      const request = found.item;
      request.request.header = headers;
      request.request.description = editFormData.description;
      
      // Update body
      if (editFormData.body && editFormData.body.trim()) {
        if (request.request.body) {
          request.request.body.raw = editFormData.body;
        } else {
          request.request.body = {
            mode: "raw",
            raw: editFormData.body,
            options: {
              raw: {
                language: "json"
              }
            }
          };
        }
      }
      
      // Update the full collection state
      setFullCollection({ ...fullCollection });
      
      // Update the display items
      const updatedItems = collectionItems.map(item => {
        if (item.id === editingRequest.id) {
          return {
            ...item,
            request: {
              ...item.request,
              header: headers,
              description: editFormData.description,
              body: request.request.body
            }
          };
        }
        return item;
      });
      setCollectionItems(updatedItems);
      
      setShowEditModal(false);
      setEditingRequest(null);
      setMessage({ type: 'success', text: 'Request updated (click Save Collection to persist)' });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to update request' });
    }
  };

  const handleClone = (request) => {
    if (!fullCollection) {
      setMessage({ type: 'danger', text: 'Collection not loaded' });
      return;
    }
    
    if (!fullCollection.items || fullCollection.items.length === 0) {
      setMessage({ type: 'danger', text: 'Collection items are empty' });
      return;
    }
    
    try {
      // Debug: Log the search parameters
      console.log('Cloning request:', {
        id: request.id,
        name: request.name,
        method: request.request?.method,
        parentFolderName: request.parentFolderName,
        fullCollectionItems: fullCollection.items?.length
      });
      
      // Find the request in the full collection structure
      const found = findRequestInCollection(fullCollection.items || [], request.id);
      
      if (!found || !found.item) {
        console.error('Request not found. Search params:', {
          uniqueKey: request.id,
          parentFolderName: request.parentFolderName,
          requestName: request.name,
          method: request.request?.method,
          fullCollectionStructure: JSON.stringify(fullCollection.items, null, 2).substring(0, 500)
        });
        setMessage({ 
          type: 'danger', 
          text: `Request "${request.name}" not found in collection. Please check the browser console for details.` 
        });
        return;
      }
      
      console.log('Request found successfully:', found);
      
      // Create a deep copy of the request
      const clonedRequest = JSON.parse(JSON.stringify(found.item));
      
      // Generate unique name (handle multiple clones)
      const baseName = request.name.replace(/ \(Copy\)( \d+)?$/, '');
      const existingCopies = collectionItems.filter(item => 
        item.name.startsWith(baseName + ' (Copy)') && 
        item.parentFolderName === request.parentFolderName
      );
      
      let newName;
      if (existingCopies.length === 0) {
        newName = `${baseName} (Copy)`;
      } else {
        newName = `${baseName} (Copy ${existingCopies.length + 1})`;
      }
      
      clonedRequest.name = newName;
      
      // Add the cloned request to the same folder as the original
      if (found.parentFolder) {
        // Add to the parent folder's item array (right after the original)
        const parentItems = found.parentFolder.item;
        const originalIndex = parentItems.findIndex(item => 
          item.request && item.name === request.name && item.request.method === request.request?.method
        );
        if (originalIndex >= 0) {
          parentItems.splice(originalIndex + 1, 0, clonedRequest);
        } else {
          parentItems.push(clonedRequest);
        }
      } else {
        // Root level - add to root items
        fullCollection.items.push(clonedRequest);
      }
      
      // Update the full collection state
      setFullCollection({ ...fullCollection });
      
      // Update display items
      const newDisplayItem = {
        ...clonedRequest,
        id: `${request.parentFolderName}|||${newName}|||${clonedRequest.request?.method || ''}`,
        path: request.path,
        parentPath: request.parentPath,
        parentFolderName: request.parentFolderName
      };
      setCollectionItems([...collectionItems, newDisplayItem]);
      
      setMessage({ type: 'success', text: `Request cloned as "${newName}" (click Save Collection to persist)` });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to clone request' });
    }
  };

  const handleDelete = (requestId) => {
    if (!fullCollection) return;
    
    const requestToDelete = collectionItems.find(item => item.id === requestId);
    if (!requestToDelete) {
      setMessage({ type: 'warning', text: 'Request not found' });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${requestToDelete.name}"?`)) {
      // Find and remove the request from the full collection structure
      const found = findRequestInCollection(fullCollection.items || [], requestId);
      if (found && found.item) {
        if (found.parentFolder) {
          // Remove from parent folder's item array
          const parentItems = found.parentFolder.item;
          const index = parentItems.findIndex(item => 
            item.request && item.name === requestToDelete.name && 
            item.request.method === requestToDelete.request?.method
          );
          if (index >= 0) {
            parentItems.splice(index, 1);
          }
        } else {
          // Remove from root items
          const rootItems = fullCollection.items;
          const index = rootItems.findIndex(item => 
            item.request && item.name === requestToDelete.name && 
            item.request.method === requestToDelete.request?.method
          );
          if (index >= 0) {
            rootItems.splice(index, 1);
          }
        }
        
        // Update the full collection state
        setFullCollection({ ...fullCollection });
      }
      
      // Update display items
      const updatedItems = collectionItems.filter(item => item.id !== requestId);
      setCollectionItems(updatedItems);
      setMessage({ type: 'success', text: `Request "${requestToDelete.name}" deleted (click Save Collection to persist)` });
    }
  };

  const handleSaveCollection = async () => {
    if (!selectedCollectionId || !fullCollection) {
      setMessage({ type: 'warning', text: 'Please select a collection first' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Send the entire collection structure as-is (no merging needed)
      await apiService.put(`/api/collections/${selectedCollectionId}`, { 
        collection: fullCollection 
      });
      setMessage({ type: 'success', text: 'Collection saved successfully!' });
      
      // Reload to get updated structure
      await loadCollectionRequests();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save collection' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Collection Editor</h2>
      
      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Select Collection</h5>
        </Card.Header>
        <Card.Body>
          <Form.Group>
            <Form.Label>Postman Collection</Form.Label>
            <Form.Select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
            >
              <option value="">-- Select a collection --</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {selectedCollectionId && (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Requests</h5>
            <Button
              variant="primary"
              onClick={handleSaveCollection}
              disabled={saving || collectionItems.length === 0}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Collection'
              )}
            </Button>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading requests...</p>
              </div>
            ) : collectionItems.length === 0 ? (
              <Alert variant="info">No requests found in this collection.</Alert>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Method</th>
                      <th>URL</th>
                      <th>Path</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionItems.map((request) => (
                      <tr key={request.id}>
                        <td>{request.name}</td>
                        <td>
                          <span className="badge bg-primary">
                            {request.request?.method || 'N/A'}
                          </span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '300px' }}>
                          {request.request?.url?.raw || 'N/A'}
                        </td>
                        <td className="text-muted small">{request.path}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(request)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleClone(request)}
                          >
                            Clone
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(request.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Request: {editingRequest?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Request description"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Headers (JSON)</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={editFormData.headers}
                onChange={(e) => setEditFormData({ ...editFormData, headers: e.target.value })}
                placeholder='[{"key": "Content-Type", "value": "application/json", "type": "text"}]'
              />
              <Form.Text className="text-muted">
                Enter headers as JSON array
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Body</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                value={editFormData.body}
                onChange={(e) => setEditFormData({ ...editFormData, body: e.target.value })}
                placeholder="Request body content"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CollectionEditor;
