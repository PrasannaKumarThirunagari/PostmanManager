import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';

const CollectionEditor = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionItems, setCollectionItems] = useState([]);
  const [fullCollection, setFullCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    method: 'GET',
    urlRaw: '',
    urlHost: '',
    urlPath: '',
    urlQuery: '',
    headers: '',
    authType: 'none',
    authValues: '',
    body: '',
    description: ''
  });

  const loadCollections = useCallback(async () => {
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    }
  }, []);

  const loadCollectionRequests = useCallback(async () => {
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
  }, [selectedCollectionId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (selectedCollectionId) {
      loadCollectionRequests();
    } else {
      setCollectionItems([]);
      setFullCollection(null);
    }
  }, [selectedCollectionId, loadCollectionRequests]);

  // Improved flattening with better unique IDs
  const flattenItems = (items, parentPath = '', parentFolderName = '', index = 0) => {
    const requests = [];
    items.forEach((item, idx) => {
      const currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
      
      if (item.request) {
        // It's a request - create a unique identifier
        // Format: parentFolderName|requestName|method|index
        const uniqueKey = `${parentFolderName}|${item.name}|${item.request?.method || ''}|${idx}`;
        requests.push({
          ...item,
          id: uniqueKey,
          path: currentPath,
          parentPath: parentPath,
          parentFolderName: parentFolderName,
          originalIndex: idx
        });
      } else if (item.item && Array.isArray(item.item)) {
        // It's a folder, recursively get requests
        const folderRequests = flattenItems(item.item, currentPath, item.name, idx);
        requests.push(...folderRequests);
      }
    });
    return requests;
  };
  
  // Improved request finder - simpler and more reliable
  const findRequestInCollection = (items, uniqueKey) => {
    if (!uniqueKey || !items) return null;
    
    const parts = uniqueKey.split('|');
    if (parts.length < 3) {
      console.error('Invalid unique key format:', uniqueKey);
      return null;
    }
    
    const [targetParentFolder, targetName, targetMethod] = parts;
    const methodUpper = (targetMethod || '').toUpperCase();
    
    // Recursive search function
    const searchRecursive = (items, parentFolder = null) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if it's a request
        if (item.request) {
          const itemMethod = (item.request?.method || '').toUpperCase();
          const itemName = item.name || '';
          
          // Match by name and method
          if (itemName === targetName && itemMethod === methodUpper) {
            // Check parent folder match
            if (!targetParentFolder || targetParentFolder === '') {
              // Root level request - no parent folder needed
              if (!parentFolder) {
                return { item: item, parentFolder: null, parentItems: items, index: i };
              }
            } else {
              // Nested request - check parent folder name
              if (parentFolder && parentFolder.name === targetParentFolder) {
                return { item: item, parentFolder: parentFolder, parentItems: items, index: i };
              }
            }
          }
        }
        
        // If it's a folder, recurse into it
        if (item.item && Array.isArray(item.item)) {
          const result = searchRecursive(item.item, item);
          if (result) return result;
        }
      }
      return null;
    };
    
    return searchRecursive(items);
  };

  const handleEdit = (request) => {
    if (!request || !request.request) {
      setMessage({ type: 'warning', text: 'Invalid request selected' });
      return;
    }
    
    try {
      const req = request.request;
      const headers = req?.header || [];
      const body = req?.body || {};
      const description = req?.description || '';
      const url = req?.url || {};
      const auth = req?.auth || null;
      
      // Parse URL components
      const urlRaw = url.raw || '';
      const urlHost = Array.isArray(url.host) ? url.host.join('.') : (url.host || '');
      const urlPath = Array.isArray(url.path) ? '/' + url.path.join('/') : (url.path || '');
      const urlQuery = url.query || [];
      
      // Parse auth
      let authType = 'none';
      let authValues = '';
      if (auth) {
        authType = auth.type || 'none';
        if (authType === 'bearer' && auth.bearer) {
          const token = auth.bearer.find(item => item.key === 'token');
          authValues = JSON.stringify({ token: token?.value || '' }, null, 2);
        } else if (authType === 'basic' && auth.basic) {
          const username = auth.basic.find(item => item.key === 'username');
          const password = auth.basic.find(item => item.key === 'password');
          authValues = JSON.stringify({
            username: username?.value || '',
            password: password?.value || ''
          }, null, 2);
        } else if (authType === 'apikey' && auth.apikey) {
          const key = auth.apikey.find(item => item.key === 'key');
          const value = auth.apikey.find(item => item.key === 'value');
          const location = auth.apikey.find(item => item.key === 'in');
          authValues = JSON.stringify({
            key: key?.value || '',
            value: value?.value || '',
            location: location?.value || 'header'
          }, null, 2);
        } else if (authType !== 'none') {
          authValues = JSON.stringify(auth, null, 2);
        }
      }
      
      setEditingRequest(request);
      setEditFormData({
        name: request.name || '',
        method: req?.method || 'GET',
        urlRaw: urlRaw,
        urlHost: urlHost,
        urlPath: urlPath,
        urlQuery: JSON.stringify(urlQuery, null, 2),
        headers: JSON.stringify(headers, null, 2),
        authType: authType,
        authValues: authValues,
        body: body.raw || (body ? JSON.stringify(body, null, 2) : ''),
        description: description || ''
      });
      setShowEditModal(true);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load request for editing' });
    }
  };

  const handleSaveEdit = () => {
    if (!editingRequest || !fullCollection) {
      setMessage({ type: 'warning', text: 'No request selected or collection not loaded' });
      return;
    }

    try {
      // Validate name
      if (!editFormData.name || !editFormData.name.trim()) {
        setMessage({ type: 'danger', text: 'Request name is required' });
        return;
      }
      
      // Parse and validate headers
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
      
      // Parse and validate query params
      let queryParams = [];
      try {
        if (editFormData.urlQuery && editFormData.urlQuery.trim()) {
          queryParams = JSON.parse(editFormData.urlQuery);
          if (!Array.isArray(queryParams)) {
            throw new Error('Query params must be an array');
          }
        }
      } catch (e) {
        setMessage({ type: 'danger', text: 'Invalid JSON format in query params. Must be a valid JSON array.' });
        return;
      }
      
      // Parse and validate auth
      let auth = null;
      if (editFormData.authType && editFormData.authType !== 'none') {
        try {
          if (editFormData.authValues && editFormData.authValues.trim()) {
            const authData = JSON.parse(editFormData.authValues);
            
            if (editFormData.authType === 'bearer') {
              auth = {
                type: 'bearer',
                bearer: [
                  { key: 'token', value: authData.token || '', type: 'string' }
                ]
              };
            } else if (editFormData.authType === 'basic') {
              auth = {
                type: 'basic',
                basic: [
                  { key: 'username', value: authData.username || '', type: 'string' },
                  { key: 'password', value: authData.password || '', type: 'string' }
                ]
              };
            } else if (editFormData.authType === 'apikey') {
              auth = {
                type: 'apikey',
                apikey: [
                  { key: 'key', value: authData.key || '', type: 'string' },
                  { key: 'value', value: authData.value || '', type: 'string' },
                  { key: 'in', value: authData.location || 'header', type: 'string' }
                ]
              };
            }
          }
        } catch (e) {
          setMessage({ type: 'danger', text: 'Invalid JSON format in auth values.' });
          return;
        }
      }
      
      // Build URL
      let url = {};
      if (editFormData.urlRaw && editFormData.urlRaw.trim()) {
        // Use raw URL if provided
        const rawUrl = editFormData.urlRaw.trim();
        
        // Check if URL contains variables (e.g., {{baseUrl}})
        if (rawUrl.includes('{{') && rawUrl.includes('}}')) {
          // URL contains variables - keep as raw and try to extract components
          url.raw = rawUrl;
          
          // Try to extract path from raw URL (after variable)
          const pathMatch = rawUrl.match(/(?:}}|\/)(\/[^?]*)/);
          if (pathMatch) {
            const pathStr = pathMatch[1];
            const pathParts = pathStr.split('/').filter(p => p);
            if (pathParts.length > 0) {
              url.path = pathParts;
            }
          }
        } else {
          // Try to parse as standard URL
          try {
            const urlObj = new URL(rawUrl);
            url.raw = rawUrl;
            url.host = [urlObj.hostname];
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
              url.path = pathParts;
            }
          } catch (e) {
            // Invalid URL format, keep as raw
            url.raw = rawUrl;
          }
        }
      } else {
        // Build from components
        const hostParts = editFormData.urlHost ? editFormData.urlHost.split('.').filter(p => p) : [];
        const pathParts = editFormData.urlPath ? editFormData.urlPath.split('/').filter(p => p) : [];
        
        url = {
          host: hostParts.length > 0 ? hostParts : [],
          path: pathParts.length > 0 ? pathParts : []
        };
        
        // Build raw URL from components
        if (hostParts.length > 0) {
          // Check if host contains variables
          const hostStr = hostParts.join('.');
          if (hostStr.includes('{{')) {
            // Host contains variables - build raw URL with variables
            const path = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
            const query = queryParams.length > 0 ? '?' + queryParams.map(q => `${q.key}=${q.value || ''}`).join('&') : '';
            url.raw = `${hostStr}${path}${query}`;
          } else {
            // Standard host - use https protocol
            const protocol = 'https';
            const host = hostParts.join('.');
            const path = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
            const query = queryParams.length > 0 ? '?' + queryParams.map(q => `${q.key}=${q.value || ''}`).join('&') : '';
            url.raw = `${protocol}://${host}${path}${query}`;
          }
        } else if (pathParts.length > 0) {
          // Only path provided (might be relative or contain variables)
          const path = '/' + pathParts.join('/');
          const query = queryParams.length > 0 ? '?' + queryParams.map(q => `${q.key}=${q.value || ''}`).join('&') : '';
          url.raw = `${path}${query}`;
        }
      }
      
      if (queryParams.length > 0) {
        url.query = queryParams;
      }
      
      // Find the request in the full collection structure
      const found = findRequestInCollection(fullCollection.item || [], editingRequest.id);
      if (!found || !found.item) {
        setMessage({ type: 'danger', text: 'Request not found in collection. Please reload the collection.' });
        return;
      }
      
      // Update the request directly in the full collection
      const request = found.item;
      
      // Update name
      request.name = editFormData.name.trim();
      
      if (!request.request) {
        request.request = {};
      }
      
      // Update method
      request.request.method = editFormData.method.toUpperCase();
      
      // Update URL
      request.request.url = url;
      
      // Update headers
      request.request.header = headers;
      
      // Update auth
      if (auth) {
        request.request.auth = auth;
      } else {
        delete request.request.auth;
      }
      
      // Update description
      request.request.description = editFormData.description || '';
      
      // Update body
      if (editFormData.body && editFormData.body.trim()) {
        if (request.request.body) {
          request.request.body.raw = editFormData.body;
          // Ensure body mode is set
          if (!request.request.body.mode) {
            request.request.body.mode = 'raw';
          }
          if (!request.request.body.options) {
            request.request.body.options = {
              raw: {
                language: 'json'
              }
            };
          }
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
      } else {
        // Remove body if empty
        delete request.request.body;
      }
      
      // Force React to detect the change
      setFullCollection({ ...fullCollection, item: [...fullCollection.item] });
      
      // Update the display items
      const updatedItems = collectionItems.map(item => {
        if (item.id === editingRequest.id) {
          return {
            ...item,
            name: request.name,
            request: {
              ...item.request,
              method: request.request.method,
              url: request.request.url,
              header: headers,
              auth: auth,
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
      setMessage({ type: 'success', text: 'Request updated successfully (click Save Collection to persist changes)' });
    } catch (error) {
      console.error('Error saving edit:', error);
      setMessage({ type: 'danger', text: error.message || 'Failed to update request' });
    }
  };

  const handleClone = (request) => {
    if (!fullCollection || !fullCollection.item) {
      setMessage({ type: 'danger', text: 'Collection not loaded' });
      return;
    }
    
    try {
      // Find the request in the full collection structure
      const found = findRequestInCollection(fullCollection.item, request.id);
      
      if (!found || !found.item) {
        setMessage({ 
          type: 'danger', 
          text: `Request "${request.name}" not found in collection. Please reload the collection.` 
        });
        return;
      }
      
      // Create a deep copy of the request
      const clonedRequest = JSON.parse(JSON.stringify(found.item));
      
      // Generate unique name (handle multiple clones)
      const baseName = request.name.replace(/ \(Copy\)( \d+)?$/i, '');
      const existingCopies = collectionItems.filter(item => {
        const itemBaseName = item.name.replace(/ \(Copy\)( \d+)?$/i, '');
        return itemBaseName === baseName && 
               item.parentFolderName === request.parentFolderName &&
               item.request?.method === request.request?.method;
      });
      
      let newName;
      if (existingCopies.length === 0) {
        newName = `${baseName} (Copy)`;
      } else {
        newName = `${baseName} (Copy ${existingCopies.length + 1})`;
      }
      
      clonedRequest.name = newName;
      
      // Remove any internal tracking fields
      delete clonedRequest.id;
      delete clonedRequest.path;
      delete clonedRequest.parentPath;
      delete clonedRequest.parentFolderName;
      delete clonedRequest.originalIndex;
      
      // Add the cloned request to the same location as the original
      if (found.parentFolder) {
        // Add to the parent folder's item array
        const parentItems = found.parentFolder.item;
        const insertIndex = found.index + 1;
        parentItems.splice(insertIndex, 0, clonedRequest);
      } else {
        // Root level - add to root items
        const insertIndex = found.index + 1;
        fullCollection.item.splice(insertIndex, 0, clonedRequest);
      }
      
      // Force React to detect the change
      setFullCollection({ ...fullCollection, item: [...fullCollection.item] });
      
      // Update display items
      const newDisplayItem = {
        ...clonedRequest,
        id: `${request.parentFolderName}|${newName}|${clonedRequest.request?.method || ''}|${Date.now()}`,
        path: request.path,
        parentPath: request.parentPath,
        parentFolderName: request.parentFolderName
      };
      setCollectionItems([...collectionItems, newDisplayItem]);
      
      setMessage({ type: 'success', text: `Request cloned as "${newName}" (click Save Collection to persist changes)` });
    } catch (error) {
      console.error('Error cloning request:', error);
      setMessage({ type: 'danger', text: error.message || 'Failed to clone request' });
    }
  };

  const handleDelete = (requestId) => {
    if (!fullCollection || !fullCollection.item) {
      setMessage({ type: 'warning', text: 'Collection not loaded' });
      return;
    }
    
    const requestToDelete = collectionItems.find(item => item.id === requestId);
    if (!requestToDelete) {
      setMessage({ type: 'warning', text: 'Request not found' });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${requestToDelete.name}"?\n\nThis action cannot be undone.`)) {
      try {
        // Find and remove the request from the full collection structure
        const found = findRequestInCollection(fullCollection.item, requestId);
        
        if (found && found.item) {
          if (found.parentFolder) {
            // Remove from parent folder's item array
            found.parentItems.splice(found.index, 1);
          } else {
            // Remove from root items
            fullCollection.item.splice(found.index, 1);
          }
          
          // Force React to detect the change
          setFullCollection({ ...fullCollection, item: [...fullCollection.item] });
        } else {
          setMessage({ type: 'warning', text: 'Request not found in collection structure' });
          return;
        }
        
        // Update display items
        const updatedItems = collectionItems.filter(item => item.id !== requestId);
        setCollectionItems(updatedItems);
        
        setMessage({ type: 'success', text: `Request "${requestToDelete.name}" deleted (click Save Collection to persist changes)` });
      } catch (error) {
        console.error('Error deleting request:', error);
        setMessage({ type: 'danger', text: error.message || 'Failed to delete request' });
      }
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
      // Clean the collection before saving (remove any internal tracking fields)
      const cleanCollection = {
        info: fullCollection.info,
        item: cleanCollectionItems(fullCollection.item)
      };
      
      await apiService.put(`/api/collections/${selectedCollectionId}`, { 
        collection: cleanCollection 
      });
      
      setMessage({ type: 'success', text: 'Collection saved successfully!' });
      
      // Reload to get updated structure
      await loadCollectionRequests();
    } catch (error) {
      console.error('Error saving collection:', error);
      setMessage({ type: 'danger', text: error.message || 'Failed to save collection' });
    } finally {
      setSaving(false);
    }
  };

  // Clean internal tracking fields from collection items
  const cleanCollectionItems = (items) => {
    return items.map(item => {
      const cleaned = { ...item };
      delete cleaned.id;
      delete cleaned.path;
      delete cleaned.parentPath;
      delete cleaned.parentFolderName;
      delete cleaned.originalIndex;
      
      if (cleaned.item && Array.isArray(cleaned.item)) {
        cleaned.item = cleanCollectionItems(cleaned.item);
      }
      
      return cleaned;
    });
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Collection Editor</h1>
        <p className="text-slate-600">Edit, clone, and delete Postman collection requests</p>
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
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-folder"></i>
            Select Collection
          </h2>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Postman Collection</label>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="select-modern"
            >
              <option value="">-- Select a collection --</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedCollectionId && (
        <div className="card-modern">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="bi bi-list-ul"></i>
              Requests
            </h2>
            <button
              onClick={handleSaveCollection}
              disabled={saving || !fullCollection || collectionItems.length === 0}
              className="bg-white text-orange-600 px-6 py-2 rounded-lg font-medium hover:bg-orange-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-save"></i>
                  Save Collection
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-600">Loading requests...</p>
              </div>
            ) : collectionItems.length === 0 ? (
              <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-100">
                <i className="bi bi-info-circle text-blue-600 text-4xl mb-4"></i>
                <p className="text-blue-800 font-medium">No requests found in this collection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Path</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collectionItems.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-4 py-4 font-medium text-slate-900">{request.name}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {request.request?.method || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-xs truncate text-slate-600 text-sm" title={request.request?.url?.raw || 'N/A'}>
                            {request.request?.url?.raw || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-sm">{request.path}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 text-sm font-medium"
                            >
                              <i className="bi bi-pencil"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => handleClone(request)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all duration-200 text-sm font-medium"
                            >
                              <i className="bi bi-files"></i>
                              Clone
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 text-sm font-medium"
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
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Request</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-slate-200 transition-colors"
              >
                <i className="bi bi-x-lg text-2xl"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <i className="bi bi-info-circle mr-2"></i>Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Request Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Request name"
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Method *</label>
                    <select
                      value={editFormData.method}
                      onChange={(e) => setEditFormData({ ...editFormData, method: e.target.value })}
                      className="select-modern"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                      <option value="HEAD">HEAD</option>
                      <option value="OPTIONS">OPTIONS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Request description"
                    className="input-modern"
                  />
                </div>
              </div>

              {/* URL */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <i className="bi bi-link-45deg mr-2"></i>URL
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Raw URL (or use components below)</label>
                  <input
                    type="text"
                    value={editFormData.urlRaw}
                    onChange={(e) => setEditFormData({ ...editFormData, urlRaw: e.target.value })}
                    placeholder="https://api.example.com/v1/users"
                    className="input-modern font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Host</label>
                    <input
                      type="text"
                      value={editFormData.urlHost}
                      onChange={(e) => setEditFormData({ ...editFormData, urlHost: e.target.value })}
                      placeholder="api.example.com"
                      className="input-modern font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Path</label>
                    <input
                      type="text"
                      value={editFormData.urlPath}
                      onChange={(e) => setEditFormData({ ...editFormData, urlPath: e.target.value })}
                      placeholder="/v1/users"
                      className="input-modern font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Query Parameters (JSON Array)</label>
                  <textarea
                    rows={4}
                    value={editFormData.urlQuery}
                    onChange={(e) => setEditFormData({ ...editFormData, urlQuery: e.target.value })}
                    placeholder='[{"key": "page", "value": "1", "type": "text"}]'
                    className="input-modern font-mono text-sm"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    Enter query parameters as JSON array. Example: [&#123;"key": "page", "value": "1"&#125;]
                  </p>
                </div>
              </div>

              {/* Headers */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <i className="bi bi-heading mr-2"></i>Headers
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Headers (JSON Array)</label>
                  <textarea
                    rows={6}
                    value={editFormData.headers}
                    onChange={(e) => setEditFormData({ ...editFormData, headers: e.target.value })}
                    placeholder='[{"key": "Content-Type", "value": "application/json", "type": "text"}]'
                    className="input-modern font-mono text-sm"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    Enter headers as JSON array. Example: [&#123;"key": "Content-Type", "value": "application/json"&#125;]
                  </p>
                </div>
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <i className="bi bi-shield-lock mr-2"></i>Authentication
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Auth Type</label>
                  <select
                    value={editFormData.authType}
                    onChange={(e) => {
                      setEditFormData({ 
                        ...editFormData, 
                        authType: e.target.value,
                        authValues: e.target.value === 'none' ? '' : editFormData.authValues
                      });
                    }}
                    className="select-modern"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key</option>
                  </select>
                </div>
                {editFormData.authType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Auth Values (JSON)
                      {editFormData.authType === 'bearer' && ' - Example: {"token": "your-token"}'}
                      {editFormData.authType === 'basic' && ' - Example: {"username": "user", "password": "pass"}'}
                      {editFormData.authType === 'apikey' && ' - Example: {"key": "X-API-Key", "value": "key-value", "location": "header"}'}
                    </label>
                    <textarea
                      rows={4}
                      value={editFormData.authValues}
                      onChange={(e) => setEditFormData({ ...editFormData, authValues: e.target.value })}
                      placeholder={
                        editFormData.authType === 'bearer' ? '{"token": "your-token"}' :
                        editFormData.authType === 'basic' ? '{"username": "user", "password": "pass"}' :
                        '{"key": "X-API-Key", "value": "key-value", "location": "header"}'
                      }
                      className="input-modern font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <i className="bi bi-file-text mr-2"></i>Request Body
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Body Content</label>
                  <textarea
                    rows={8}
                    value={editFormData.body}
                    onChange={(e) => setEditFormData({ ...editFormData, body: e.target.value })}
                    placeholder="Request body content (JSON, XML, etc.)"
                    className="input-modern font-mono text-sm"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the request body content. For JSON, use proper JSON format.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-secondary-modern"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-primary-modern"
              >
                <i className="bi bi-check-lg mr-2"></i>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionEditor;
