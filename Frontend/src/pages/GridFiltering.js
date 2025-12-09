import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Table, Badge, Row, Col, InputGroup } from 'react-bootstrap';
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

  return (
    <div>
      <h2 className="mb-4">Postman Grid Filtering</h2>
      
      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Section 1: Collection and Endpoint Selection */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Section 1: Select Collection and Endpoint</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Postman Collection</Form.Label>
            <Form.Select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select a collection --</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
            </Col>
            <Col md={6}>
            <Form.Group className="mb-3">
                <Form.Label>Endpoint</Form.Label>
              {loadingRequests ? (
                <div className="text-center py-2">
                  <Spinner animation="border" size="sm" className="me-2" />
                    Loading endpoints...
                </div>
              ) : (
                <Form.Select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                    disabled={!selectedCollectionId}
                >
                    <option value="">-- Select an endpoint --</option>
                  {requests.map((request) => (
                    <option key={request.id} value={request.id}>
                        {request.name} ({request.request?.method || 'N/A'})
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {selectedRequest && (
        <>
          {/* Section 2: Request and Response Display */}
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Section 2: Request Body</h5>
                </Card.Header>
                <Card.Body>
                  {requestBody ? (
                    <div>
                      <pre style={{ 
                        maxHeight: '400px', 
                        overflow: 'auto', 
                        backgroundColor: '#f8f9fa', 
                        padding: '15px', 
                        borderRadius: '5px',
                        fontSize: '12px'
                      }}>
                        {typeof requestBody.parsed === 'object' 
                          ? JSON.stringify(requestBody.parsed, null, 2)
                          : requestBody.raw}
                      </pre>
                    </div>
                  ) : (
                    <Alert variant="info">No request body available</Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Section 2: Response Body</h5>
                  {responses.length > 0 && (
                    <Form.Select
                      size="sm"
                      style={{ width: 'auto' }}
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
                    </Form.Select>
                  )}
                </Card.Header>
                <Card.Body>
                  {responseBody ? (
                    <div>
                      <pre style={{ 
                        maxHeight: '400px', 
                        overflow: 'auto', 
                        backgroundColor: '#f8f9fa', 
                        padding: '15px', 
                        borderRadius: '5px',
                        fontSize: '12px'
                      }}>
                        {typeof responseBody.parsed === 'object' 
                          ? JSON.stringify(responseBody.parsed, null, 2)
                          : responseBody.raw}
                      </pre>
                    </div>
                  ) : (
                    <Alert variant="info">
                      {responses.length > 0 
                        ? 'Please select a response from the dropdown above'
                        : 'No response examples available for this request'}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Section 3: Mapping Area - Field Mapping Configuration */}
          {responseBody && Object.keys(responseAttributes).length > 0 && (
            <>
              {/* Request Body Attribute Mapping */}
              {requestBody && requestBodyAttributes.length > 0 && (
                <Card className="mb-4">
                  <Card.Header>
                    <h5 className="mb-0">Section 3: Request Body Attribute Mapping</h5>
                  </Card.Header>
                  <Card.Body>
                    <Alert variant="info" className="mb-3">
                      <strong>Map Request Body Attributes:</strong> Configure how each request body attribute should be populated in generated requests.
                    </Alert>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th style={{ width: '20%' }}>Request Field</th>
                          <th style={{ width: '15%' }}>Mapping Mode</th>
                          <th style={{ width: '30%' }}>Source/Value</th>
                          <th style={{ width: '10%' }}>Enabled</th>
                          <th style={{ width: '25%' }}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requestBodyAttributes.map((attr) => {
                          const mapping = requestBodyMappings[attr] || { mode: 'none', source: '', value: '', enabled: true };
                          return (
                            <tr key={attr}>
                              <td><strong>{attr}</strong></td>
                              <td>
                                <Form.Select
                                  size="sm"
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
                                </Form.Select>
                              </td>
                              <td>
                                {mapping.mode === 'response' && (
                                  <Form.Select
                                    size="sm"
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
                                  </Form.Select>
                                )}
                                {mapping.mode === 'manual' && (
                                  <Form.Control
                                    size="sm"
                                    type="text"
                                    placeholder="Enter value"
                                    value={mapping.value}
                                    onChange={(e) => {
                                      setRequestBodyMappings({
                                        ...requestBodyMappings,
                                        [attr]: { ...mapping, value: e.target.value }
                                      });
                                    }}
                                  />
                                )}
                                {mapping.mode === 'special' && (
                                  <Form.Select
                                    size="sm"
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
                                  </Form.Select>
                                )}
                                {mapping.mode === 'none' && (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-center">
                                <Form.Check
                                  type="switch"
                                  checked={mapping.enabled}
                                  onChange={(e) => {
                                    setRequestBodyMappings({
                                      ...requestBodyMappings,
                                      [attr]: { ...mapping, enabled: e.target.checked }
                                    });
                                  }}
                                />
                              </td>
                              <td>
                                <small className="text-muted">
                                  {mapping.mode === 'response' && 'Maps from response attribute'}
                                  {mapping.mode === 'manual' && 'Uses fixed manual value'}
                                  {mapping.mode === 'special' && 'Uses special system value'}
                                  {mapping.mode === 'none' && 'Not mapped - will use original value'}
                                </small>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}

              {/* Field Mapping Configuration */}
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Section 3: Field Mapping Configuration</h5>
                </Card.Header>
                <Card.Body>
                  {/* Object Type Input */}
                  <Card className="mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Object Type</strong> (Applied to all requests)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="e.g., Portfolio, User, Product, etc."
                          value={fieldMappings.objectType.value}
                          onChange={(e) => setFieldMappings({
                            ...fieldMappings,
                            objectType: { ...fieldMappings.objectType, value: e.target.value }
                          })}
                        />
                        <Form.Text className="text-muted">
                          This value will be applied to all generated requests as the `objectType` field (if mapped)
                        </Form.Text>
                      </Form.Group>
                    </Card.Body>
                  </Card>

                {/* Condition Generation Mode */}
                <Card className="mb-4">
                  <Card.Body>
              <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Generate all conditions for each attribute"
                        checked={generateAllConditions}
                        onChange={(e) => setGenerateAllConditions(e.target.checked)}
                />
                <Form.Text className="text-muted">
                        If checked, generates requests for all applicable conditions per attribute. 
                        If unchecked, you can select specific conditions per attribute below.
                </Form.Text>
              </Form.Group>
          </Card.Body>
        </Card>

                {/* Response Attributes with Condition Selection */}
                <Card>
          <Card.Body>
                    <h6 className="mb-3">Response Attributes and Condition Selection</h6>
                    <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                          <th style={{ width: '25%' }}>Attribute Name</th>
                          <th style={{ width: '15%' }}>Data Type</th>
                          <th style={{ width: '10%' }}>Nullable</th>
                          <th style={{ width: '50%' }}>Select Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
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
                            <tr key={attrName}>
                              <td>
                                <strong>{attrName}</strong>
                                {attrData.name && attrData.name !== attrName && (
                                  <div><small className="text-muted">({attrData.name})</small></div>
                                )}
                              </td>
                              <td>
                                <Badge bg={dataType === 'string' ? 'primary' : dataType === 'integer' || dataType === 'number' ? 'success' : 'warning'}>
                                  {dataType}
                            </Badge>
                                {attrData.format && (
                                  <div><small className="text-muted">({attrData.format})</small></div>
                                )}
                          </td>
                              <td>
                                {attrData.nullable ? (
                                  <Badge bg="info">Yes</Badge>
                                ) : (
                                  <Badge bg="secondary">No</Badge>
                                )}
                          </td>
                          <td>
                                {!generateAllConditions ? (
                                  <div>
                                    <div className="mb-2">
                            <Button
                              size="sm"
                                        variant="outline-primary"
                                        onClick={() => selectAllConditions(attrName, dataType)}
                              className="me-2"
                            >
                                        Select All
                            </Button>
                            <Button
                              size="sm"
                                        variant="outline-secondary"
                                        onClick={() => deselectAllConditions(attrName)}
                                      >
                                        Deselect All
                            </Button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                      {availableConditions.map(condition => (
                                        <Form.Check
                                          key={condition}
                                          type="checkbox"
                                          label={condition}
                                          checked={selectedForAttr.includes(condition)}
                                          onChange={() => toggleCondition(attrName, condition)}
                                          inline
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <Badge bg="info">
                                      {availableConditions.length} conditions will be generated
                                    </Badge>
                                    <div className="mt-1">
                                      <small className="text-muted">
                                        {availableConditions.join(', ')}
                                      </small>
                                    </div>
                                  </div>
                                )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                  </Card.Body>
                </Card>
              </Card.Body>
            </Card>

            {/* Section 4: Generate Collection */}
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Section 4: Generate Collection</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <Alert variant="info">
                    <strong>Note:</strong> Generated filtering requests will be added to a folder named <strong>"{selectedRequest?.name || 'Request'} Filtering"</strong> in the original collection.
                  </Alert>
                </div>
                
                <div className="mb-3">
                  <Alert variant="info">
                    <strong>Summary:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Response Attributes: {Object.keys(responseAttributes).length}</li>
                      <li>Object Type: {fieldMappings.objectType.value || 'Not set'}</li>
                      <li>Total Requests to Generate: <strong>{calculateTotalRequests()}</strong></li>
                      <li>Generation Mode: {generateAllConditions ? 'All Conditions' : 'Selected Conditions Only'}</li>
                    </ul>
                  </Alert>
                </div>

                <Button
                  variant="success"
                  size="lg"
                  onClick={handleGenerateCollection}
                  disabled={generating || calculateTotalRequests() === 0 || !fieldMappings.objectType.value}
                >
                  {generating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generating Collection...
                    </>
                  ) : (
                    'Generate and Save Collection'
                  )}
                </Button>
              </Card.Body>
            </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GridFiltering;
