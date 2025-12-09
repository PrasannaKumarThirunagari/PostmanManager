import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

const GridFiltering = () => {
  // Section 1: Collection and Endpoint Selection
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Section 2: Request and Response Display
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responses, setResponses] = useState([]);

  // Section 3: Mapping Area - Field Mapping Configuration
  const [responseAttributes, setResponseAttributes] = useState({}); // Schema metadata
  const [requestBodyAttributes, setRequestBodyAttributes] = useState([]); // Extracted from request body
  const [requestBodyMappings, setRequestBodyMappings] = useState({}); // {requestField: {mode, source, value}}
  const [fieldMappings, setFieldMappings] = useState({
    attributeName: { mode: 'response', value: '', manualValue: '' },
    objectType: { mode: 'manual', value: '' },
    dataType: { mode: 'response', value: '', manualValue: '' },
    condition: { mode: 'auto', value: [], selectedConditions: {} }, // {attributeName: [conditions]}
    attributeValue: { mode: 'template', value: '{{attributeValue}}' }
  });
  const [selectedConditions, setSelectedConditions] = useState({}); // {attributeName: [conditions]}

  // Section 4: Collection Generation
  const [generating, setGenerating] = useState(false);
  const [generateAllConditions, setGenerateAllConditions] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollectionId) {
      loadRequests();
    } else {
      setRequests([]);
      setSelectedRequestId('');
      setSelectedRequest(null);
    }
  }, [selectedCollectionId]);

  useEffect(() => {
    if (selectedRequestId && requests.length > 0) {
      const request = requests.find(r => r.id === selectedRequestId);
      if (request) {
        setSelectedRequest(request);
        loadRequestDetails(request);
      }
    } else {
      setSelectedRequest(null);
      setRequestBody(null);
      setResponseBody(null);
      setResponses([]);
      setResponseAttributes({});
      setFieldMappings({
        attributeName: { mode: 'response', value: '', manualValue: '' },
        objectType: { mode: 'manual', value: '' },
        dataType: { mode: 'response', value: '', manualValue: '' },
        condition: { mode: 'auto', value: [], selectedConditions: {} },
        attributeValue: { mode: 'template', value: '{{attributeValue}}' }
      });
      setSelectedConditions({});
    }
  }, [selectedRequestId, requests]);

  useEffect(() => {
    if (selectedRequest) {
      loadRequestWithResponses();
    } else {
      setResponses([]);
      setResponseBody(null);
    }
  }, [selectedRequest, selectedCollectionId]);

  const loadCollections = async () => {
    try {
      const response = await apiService.get('/api/collections');
      setCollections(response.collections || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load collections' });
    }
  };

  const loadRequests = async () => {
    if (!selectedCollectionId) return;
    
    setLoadingRequests(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await apiService.get(`/api/collections/${selectedCollectionId}/requests`);
      const allRequests = flattenItems(response.items || []);
      setRequests(allRequests);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load requests' });
    } finally {
      setLoadingRequests(false);
    }
  };

  const flattenItems = (items, parentPath = '') => {
    const requests = [];
    items.forEach((item, index) => {
      const currentPath = parentPath ? `${parentPath} > ${item.name}` : item.name;
      
      if (item.request) {
        requests.push({
          ...item,
          id: `${parentPath}-${index}-${Date.now()}`,
          path: currentPath
        });
      } else if (item.item && Array.isArray(item.item)) {
        const folderRequests = flattenItems(item.item, currentPath);
        requests.push(...folderRequests);
      }
    });
    return requests;
  };

  const loadRequestDetails = async (request) => {
    if (!request || !request.request) return;

    try {
      const req = request.request;
      const body = req.body || {};

      // Parse request body
      let parsedBody = null;
      if (body.raw) {
        try {
          parsedBody = JSON.parse(body.raw);
        } catch (e) {
          parsedBody = body.raw;
        }
      } else if (body.formdata) {
        parsedBody = body.formdata;
      } else if (body.urlencoded) {
        parsedBody = body.urlencoded;
      }

      setRequestBody({
        raw: body.raw || '',
        parsed: parsedBody,
        mode: body.mode || 'raw'
      });

      // Extract request body attributes for mapping
      if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
        const attributes = extractRequestBodyAttributes(parsedBody);
        setRequestBodyAttributes(attributes);
        
        // Initialize mappings for each request body attribute
        const initialMappings = {};
        attributes.forEach(attr => {
          initialMappings[attr] = {
            mode: 'none', // 'none', 'response', 'manual', 'special'
            source: '', // response attribute name or special value
            value: '', // manual value
            enabled: true
          };
        });
        setRequestBodyMappings(initialMappings);
      } else {
        setRequestBodyAttributes([]);
        setRequestBodyMappings({});
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
    }
  };

  // Extract flat attributes from request body
  const extractRequestBodyAttributes = (data, prefix = '') => {
    const attributes = [];
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // For arrays, extract from first element if it's an object
        if (data.length > 0 && typeof data[0] === 'object') {
          const nested = extractRequestBodyAttributes(data[0], prefix);
          attributes.push(...nested);
        }
      } else {
        // For objects, extract all keys
        Object.keys(data).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = data[key];
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Nested object - recurse
            const nested = extractRequestBodyAttributes(value, fullKey);
            attributes.push(...nested);
          } else {
            // Leaf attribute
            attributes.push(fullKey);
          }
        });
      }
    }
    
    return attributes;
  };

  const loadRequestWithResponses = async () => {
    if (!selectedCollectionId || !selectedRequest) return;

    try {
      const fullResponse = await apiService.get(`/api/collections/${selectedCollectionId}/full`);
      const fullCollection = fullResponse.items || [];
      
      const foundRequest = findRequestInFullCollection(fullCollection, selectedRequest);
      
      if (foundRequest && foundRequest.response && foundRequest.response.length > 0) {
        setResponses(foundRequest.response);
        // Default to 200 response if available
        const successResponse = foundRequest.response.find(r => (r.code || r.status) === 200) || foundRequest.response[0];
        if (successResponse) {
          handleResponseSelect(successResponse);
        }
      } else {
          setResponses([]);
        setResponseBody(null);
      }
    } catch (error) {
      console.error('Failed to load responses:', error);
      setResponses([]);
    }
  };

  const findRequestInFullCollection = (items, targetRequest) => {
    if (!targetRequest || !targetRequest.request) return null;

    const targetName = targetRequest.name || '';
    const targetMethod = (targetRequest.request?.method || '').toUpperCase();
    
    const findRecursive = (items) => {
      for (const item of items) {
        if (item.item && Array.isArray(item.item)) {
          const found = findRecursive(item.item);
          if (found) return found;
        } else if (item.request) {
          const itemName = item.name || '';
          const itemMethod = (item.request.method || '').toUpperCase();
          
          if (itemName === targetName && itemMethod === targetMethod) {
            return item;
          }
        }
      }
      return null;
    };

    return findRecursive(items);
  };

  const handleResponseSelect = async (response) => {
    setSelectedResponse(response);
    
    // Parse response body
    let parsedBody = null;
    const body = response.body || '';
    
    try {
      if (typeof body === 'string') {
        parsedBody = JSON.parse(body);
      } else {
        parsedBody = body;
        }
      } catch (e) {
      parsedBody = body;
    }

    setResponseBody({
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      parsed: parsedBody
    });

    // Extract attributes from response body (schema metadata)
    if (parsedBody && typeof parsedBody === 'object') {
      try {
        const response = await apiService.post('/api/collections/extract-attributes', parsedBody);
        setResponseAttributes(response.attributes || {});
        
        // Initialize selected conditions for each attribute
        const initialConditions = {};
        Object.keys(response.attributes || {}).forEach(attr => {
          initialConditions[attr] = [];
        });
        setSelectedConditions(initialConditions);
      } catch (error) {
        console.error('Failed to extract attributes:', error);
        setResponseAttributes({});
        setSelectedConditions({});
      }
    } else {
      setResponseAttributes({});
      setSelectedConditions({});
    }
  };

  const [conditionsCache, setConditionsCache] = useState({}); // Cache conditions by dataType

  const getConditionsForType = async (type) => {
    // Check cache first
    if (conditionsCache[type]) {
      return conditionsCache[type];
    }

    // Normalize type for API call
    let normalizedType = type.toLowerCase();
    if (['integer', 'int32', 'int64'].includes(normalizedType)) {
      normalizedType = 'integer';
    } else if (['number', 'float', 'double'].includes(normalizedType)) {
      normalizedType = 'number';
    }

    try {
      const response = await apiService.get(`/api/filtering-conditions/keys/${normalizedType}`);
      const keys = response.keys || [];
      
      // Update cache
      setConditionsCache(prev => ({
        ...prev,
        [type]: keys
      }));
      
      return keys;
    } catch (error) {
      console.error(`Error loading conditions for type ${type}:`, error);
      // Fallback to defaults
      if (type === 'string') {
        return ['EQ', 'NEQ', 'Contains', 'NotContains'];
      } else if (['integer', 'number', 'int32', 'int64', 'float', 'double'].includes(type)) {
        return ['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'];
      } else if (type === 'boolean') {
        return ['EQ', 'NEQ'];
      }
      return ['EQ', 'NEQ'];
    }
  };

  // Load conditions for all attribute types when response attributes change
  useEffect(() => {
    const loadConditionsForAttributes = async () => {
      const types = new Set();
      Object.values(responseAttributes).forEach(attr => {
        const type = attr.type || 'string';
        let normalizedType = type.toLowerCase();
        if (['integer', 'int32', 'int64'].includes(normalizedType)) {
          normalizedType = 'integer';
        } else if (['number', 'float', 'double'].includes(normalizedType)) {
          normalizedType = 'number';
        }
        types.add(normalizedType);
      });

      // Load conditions for each unique type
      for (const type of types) {
        if (!conditionsCache[type]) {
          try {
            const response = await apiService.get(`/api/filtering-conditions/keys/${type}`);
            setConditionsCache(prev => ({
              ...prev,
              [type]: response.keys || []
            }));
          } catch (error) {
            console.error(`Error loading conditions for type ${type}:`, error);
          }
        }
      }
    };

    if (Object.keys(responseAttributes).length > 0) {
      loadConditionsForAttributes();
    }
  }, [responseAttributes]);

  const toggleCondition = (attributeName, condition) => {
    setSelectedConditions(prev => {
      const current = prev[attributeName] || [];
      const updated = current.includes(condition)
        ? current.filter(c => c !== condition)
        : [...current, condition];
      return {
        ...prev,
        [attributeName]: updated
      };
    });
  };

  const selectAllConditions = async (attributeName, dataType) => {
    const allConditions = await getConditionsForType(dataType);
    setSelectedConditions(prev => ({
      ...prev,
      [attributeName]: allConditions
    }));
  };

  const deselectAllConditions = (attributeName) => {
    setSelectedConditions(prev => ({
      ...prev,
      [attributeName]: []
    }));
  };

  const calculateTotalRequests = () => {
    if (generateAllConditions) {
      let total = 0;
      Object.entries(responseAttributes).forEach(([attrName, attrData]) => {
        const dataType = attrData.type || 'string';
        // Use cached conditions or fallback
        const cached = conditionsCache[dataType] || conditionsCache[dataType.toLowerCase()];
        if (cached) {
          total += cached.length;
        } else {
          // Fallback calculation
          if (dataType === 'string') {
            total += 4;
          } else if (['integer', 'number', 'int32', 'int64', 'float', 'double'].includes(dataType)) {
            total += 6;
          } else if (dataType === 'boolean') {
            total += 2;
          } else {
            total += 2;
          }
        }
      });
      return total;
    } else {
      return Object.values(selectedConditions).reduce((sum, conditions) => sum + conditions.length, 0);
    }
  };

  const handleGenerateCollection = async () => {
    if (!selectedRequest || !responseBody || !responseBody.parsed) {
      setMessage({ type: 'warning', text: 'Please select a request and response first' });
      return;
    }

    if (Object.keys(responseAttributes).length === 0) {
      setMessage({ type: 'warning', text: 'No response attributes found. Please select a valid response.' });
      return;
    }

    // Validate that at least some conditions are selected if not generating all
    if (!generateAllConditions) {
      const totalSelected = Object.values(selectedConditions).reduce((sum, conditions) => sum + conditions.length, 0);
      if (totalSelected === 0) {
        setMessage({ type: 'warning', text: 'Please select at least one condition for at least one attribute' });
        return;
      }
    }

    setGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiService.post('/api/collections/generate-filtered', {
        collection_id: selectedCollectionId,
        request_name: selectedRequest.name,
        request_method: selectedRequest.request?.method || 'GET',
        response_body: responseBody.parsed,
        mappings: [], // Not used in iteration mode
        filters: [], // Not used in iteration mode
        object_type: fieldMappings.objectType.value || 'Object',
        selected_conditions: generateAllConditions ? null : selectedConditions,
        generate_all_conditions: generateAllConditions,
        request_body_mappings: requestBodyMappings // New: send request body mappings
      });

      setMessage({ 
        type: 'success', 
        text: `Filtering folder "${response.folder_name}" added successfully to collection "${response.name}" with ${response.requests_generated} requests!` 
      });
      
      // Reload requests to show the new folder
      await loadRequests();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to generate collection' });
    } finally {
      setGenerating(false);
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Postman Grid Filtering</h1>
        <p className="text-slate-600">Generate filtered requests based on response attributes</p>
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

      {/* Section 1: Collection and Endpoint Selection */}
      <div className="card-modern mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-1-circle"></i>
            Section 1: Select Collection and Endpoint
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Postman Collection</label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                disabled={loading}
                className="select-modern disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a collection --</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Endpoint</label>
              {loadingRequests ? (
                <div className="flex items-center gap-2 text-slate-600 py-2">
                  <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading endpoints...
                </div>
              ) : (
                <select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  disabled={!selectedCollectionId}
                  className="select-modern disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select an endpoint --</option>
                  {requests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.name} ({request.request?.method || 'N/A'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <>
          {/* Section 2: Request and Response Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="card-modern">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <i className="bi bi-2-circle"></i>
                  Section 2: Request Body
                </h2>
              </div>
              <div className="p-6">
                {requestBody ? (
                  <div>
                    <pre className="max-h-[400px] overflow-auto bg-slate-100 p-4 rounded-lg text-xs font-mono">
                      {typeof requestBody.parsed === 'object' 
                        ? JSON.stringify(requestBody.parsed, null, 2)
                        : requestBody.raw}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                    <i className="bi bi-info-circle mr-2"></i>
                    No request body available
                  </div>
                )}
              </div>
            </div>
            <div className="card-modern">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <i className="bi bi-2-circle"></i>
                  Section 2: Response Body
                </h2>
                {responses.length > 0 && (
                  <select
                    className="px-3 py-1.5 text-sm border border-white/30 rounded-lg bg-white/20 text-white focus:ring-2 focus:ring-white/50 focus:border-white transition-all"
                    value={selectedResponse ? `${selectedResponse.code || selectedResponse.status}` : ''}
                    onChange={(e) => {
                      const status = e.target.value;
                      const found = responses.find(r => String(r.code || r.status) === status);
                      if (found) handleResponseSelect(found);
                    }}
                  >
                    <option value="">Select response...</option>
                    {responses.map((r, idx) => (
                      <option key={idx} value={r.code || r.status}>
                        {r.code || r.status} - {r.name || `Response ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="p-6">
                {responseBody ? (
                  <div>
                    <pre className="max-h-[400px] overflow-auto bg-slate-100 p-4 rounded-lg text-xs font-mono">
                      {typeof responseBody.parsed === 'object' 
                        ? JSON.stringify(responseBody.parsed, null, 2)
                        : responseBody.raw}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                    <i className="bi bi-info-circle mr-2"></i>
                    {responses.length > 0 
                      ? 'Please select a response from the dropdown above'
                      : 'No response examples available for this request'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Mapping Area - Field Mapping Configuration */}
          {responseBody && Object.keys(responseAttributes).length > 0 && (
            <>
              {/* Request Body Attribute Mapping */}
              {requestBody && requestBodyAttributes.length > 0 && (
                <div className="card-modern mb-6">
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <i className="bi bi-3-circle"></i>
                      Section 3: Request Body Attribute Mapping
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4">
                      <strong>Map Request Body Attributes:</strong> Configure how each request body attribute should be populated in generated requests.
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '20%' }}>Request Field</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>Mapping Mode</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '30%' }}>Source/Value</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '10%' }}>Enabled</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '25%' }}>Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {requestBodyAttributes.map((attr) => {
                            const mapping = requestBodyMappings[attr] || { mode: 'none', source: '', value: '', enabled: true };
                            return (
                              <tr key={attr} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 font-semibold text-slate-900">{attr}</td>
                                <td className="px-4 py-4">
                                  <select
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={mapping.mode}
                                    onChange={(e) => {
                                      setRequestBodyMappings({
                                        ...requestBodyMappings,
                                        [attr]: {
                                          ...mapping,
                                          mode: e.target.value,
                                          source: '',
                                          value: ''
                                        }
                                      });
                                    }}
                                  >
                                    <option value="none">No Mapping</option>
                                    <option value="response">From Response</option>
                                    <option value="manual">Manual Value</option>
                                    <option value="special">Special Value</option>
                                  </select>
                                </td>
                                <td className="px-4 py-4">
                                  {mapping.mode === 'response' && (
                                    <select
                                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      value={mapping.source}
                                      onChange={(e) => {
                                        setRequestBodyMappings({
                                          ...requestBodyMappings,
                                          [attr]: { ...mapping, source: e.target.value }
                                        });
                                      }}
                                    >
                                      <option value="">-- Select Response Attribute --</option>
                                      {Object.keys(responseAttributes).map(respAttr => (
                                        <option key={respAttr} value={respAttr}>{respAttr}</option>
                                      ))}
                                    </select>
                                  )}
                                  {mapping.mode === 'manual' && (
                                    <input
                                      type="text"
                                      placeholder="Enter value"
                                      value={mapping.value}
                                      onChange={(e) => {
                                        setRequestBodyMappings({
                                          ...requestBodyMappings,
                                          [attr]: { ...mapping, value: e.target.value }
                                        });
                                      }}
                                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  )}
                                  {mapping.mode === 'special' && (
                                    <select
                                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      value={mapping.source}
                                      onChange={(e) => {
                                        setRequestBodyMappings({
                                          ...requestBodyMappings,
                                          [attr]: { ...mapping, source: e.target.value }
                                        });
                                      }}
                                    >
                                      <option value="">-- Select Special Value --</option>
                                      <option value="attributeName">Attribute Name (from response)</option>
                                      <option value="objectType">Object Type (user input)</option>
                                      <option value="dataType">Data Type (from response)</option>
                                      <option value="condition">Condition (EQ, NEQ, etc.)</option>
                                      <option value="attributeValue">Attribute Value (template)</option>
                                    </select>
                                  )}
                                  {mapping.mode === 'none' && (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={mapping.enabled}
                                    onChange={(e) => {
                                      setRequestBodyMappings({
                                        ...requestBodyMappings,
                                        [attr]: { ...mapping, enabled: e.target.checked }
                                      });
                                    }}
                                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-sm text-slate-500">
                                    {mapping.mode === 'response' && 'Maps from response attribute'}
                                    {mapping.mode === 'manual' && 'Uses fixed manual value'}
                                    {mapping.mode === 'special' && 'Uses special system value'}
                                    {mapping.mode === 'none' && 'Not mapped - will use original value'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Field Mapping Configuration */}
              <div className="card-modern mb-6">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="bi bi-3-circle"></i>
                    Section 3: Field Mapping Configuration
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Object Type Input */}
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <strong>Object Type</strong> (Applied to all requests)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Portfolio, User, Product, etc."
                        value={fieldMappings.objectType.value}
                        onChange={(e) => setFieldMappings({
                          ...fieldMappings,
                          objectType: { ...fieldMappings.objectType, value: e.target.value }
                        })}
                        className="input-modern"
                      />
                      <p className="mt-2 text-sm text-slate-500">
                        This value will be applied to all generated requests as the `objectType` field (if mapped)
                      </p>
                    </div>
                  </div>

                  {/* Condition Generation Mode */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div>
                      <label className="flex items-center gap-3 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateAllConditions}
                          onChange={(e) => setGenerateAllConditions(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700">Generate all conditions for each attribute</span>
                      </label>
                      <p className="mt-2 text-sm text-slate-500 ml-8">
                        If checked, generates requests for all applicable conditions per attribute. 
                        If unchecked, you can select specific conditions per attribute below.
                      </p>
                    </div>
                  </div>

                  {/* Response Attributes with Condition Selection */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Response Attributes and Condition Selection</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '25%' }}>Attribute Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '15%' }}>Data Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '10%' }}>Nullable</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider" style={{ width: '50%' }}>Select Conditions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(responseAttributes).map(([attrName, attrData]) => {
                            const dataType = attrData.type || 'string';
                            // Get conditions from cache or use fallback
                            let availableConditions = conditionsCache[dataType] || conditionsCache[dataType.toLowerCase()];
                            if (!availableConditions) {
                              // Fallback
                              if (dataType === 'string') {
                                availableConditions = ['EQ', 'NEQ', 'Contains', 'NotContains'];
                              } else if (['integer', 'number', 'int32', 'int64', 'float', 'double'].includes(dataType)) {
                                availableConditions = ['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'];
                              } else if (dataType === 'boolean') {
                                availableConditions = ['EQ', 'NEQ'];
                              } else {
                                availableConditions = ['EQ', 'NEQ'];
                              }
                            }
                            const selectedForAttr = selectedConditions[attrName] || [];
                        
                            return (
                              <tr key={attrName} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4">
                                  <strong className="text-slate-900">{attrName}</strong>
                                  {attrData.name && attrData.name !== attrName && (
                                    <div className="text-xs text-slate-500 mt-1">({attrData.name})</div>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    dataType === 'string' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : dataType === 'integer' || dataType === 'number'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {dataType}
                                  </span>
                                  {attrData.format && (
                                    <div className="text-xs text-slate-500 mt-1">({attrData.format})</div>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    attrData.nullable 
                                      ? 'bg-cyan-100 text-cyan-800' 
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {attrData.nullable ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  {!generateAllConditions ? (
                                    <div>
                                      <div className="mb-3 flex gap-2">
                                        <button
                                          onClick={() => selectAllConditions(attrName, dataType)}
                                          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                        >
                                          Select All
                                        </button>
                                        <button
                                          onClick={() => deselectAllConditions(attrName)}
                                          className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                        >
                                          Deselect All
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {availableConditions.map(condition => (
                                          <label key={condition} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={selectedForAttr.includes(condition)}
                                              onChange={() => toggleCondition(attrName, condition)}
                                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700">{condition}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                                        {availableConditions.length} conditions will be generated
                                      </span>
                                      <div className="mt-2 text-xs text-slate-500">
                                        {availableConditions.join(', ')}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

            {/* Section 4: Generate Collection */}
            <div className="card-modern mb-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <i className="bi bi-4-circle"></i>
                  Section 4: Generate Collection
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                  <strong>Note:</strong> Generated filtering requests will be added to a folder named <strong>"{selectedRequest?.name || 'Request'} Filtering"</strong> in the original collection.
                </div>
                
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                  <strong>Summary:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Response Attributes: {Object.keys(responseAttributes).length}</li>
                    <li>Object Type: {fieldMappings.objectType.value || 'Not set'}</li>
                    <li>Total Requests to Generate: <strong>{calculateTotalRequests()}</strong></li>
                    <li>Generation Mode: {generateAllConditions ? 'All Conditions' : 'Selected Conditions Only'}</li>
                  </ul>
                </div>

                <button
                  onClick={handleGenerateCollection}
                  disabled={generating || calculateTotalRequests() === 0 || !fieldMappings.objectType.value}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Collection...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-lightning-fill"></i>
                      Generate and Save Collection
                    </>
                  )}
                </button>
              </div>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GridFiltering;
