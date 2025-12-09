import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import apiService from '../services/api.service';

// Default auth types - show all by default
const DEFAULT_AUTH_TYPES = [
  { value: 'apiKey', label: 'API Key' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'jwt', label: 'JWT Token' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'openIdConnect', label: 'OpenID Connect' },
];

const SwaggerConverter = () => {
  const [swaggerFiles, setSwaggerFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedAuthType, setSelectedAuthType] = useState('');
  const [authValues, setAuthValues] = useState({
    apiKey: { key: '', value: '', location: 'header' }, // location: 'header' or 'query'
    basic: { username: '', password: '' },
    bearer: { token: '' },
    jwt: { token: '' },
    oauth2: { token: '' },
    openIdConnect: { token: '' },
  });
  const [injections, setInjections] = useState({
    xss: false,
    sql: false,
    html: false,
  });
  const [environments, setEnvironments] = useState({
    local: false,
    dev: false,
    qa: false,
    uat: false,
    prod: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [authorizationTypes, setAuthorizationTypes] = useState(DEFAULT_AUTH_TYPES);
  const [loadingAuthTypes, setLoadingAuthTypes] = useState(false);

  useEffect(() => {
    loadSwaggerFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadAuthorizationTypes(selectedFile);
    } else {
      // Reset to default auth types when no file is selected
      setAuthorizationTypes(DEFAULT_AUTH_TYPES);
      setSelectedAuthType('');
    }
  }, [selectedFile]);

  const loadSwaggerFiles = async () => {
    try {
      const response = await apiService.get('/api/swagger/files');
      setSwaggerFiles(response.files || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load Swagger files' });
    }
  };

  const loadAuthorizationTypes = async (fileId) => {
    setLoadingAuthTypes(true);
    try {
      const response = await apiService.get(`/api/swagger/files/${fileId}/authorization-types`);
      const authTypes = response.authorization_types || [];
      
      // Map backend types to frontend format
      const mappedTypes = authTypes.map(auth => {
        // Map backend type to frontend value
        let value = auth.type;
        if (auth.type === 'bearer') value = 'bearer';
        else if (auth.type === 'apiKey') value = 'apiKey';
        else if (auth.type === 'basic') value = 'basic';
        else if (auth.type === 'oauth2') value = 'oauth2';
        else if (auth.type === 'openIdConnect') value = 'openIdConnect';
        
        // Use display name from backend or generate one
        let label = auth.display || auth.name;
        if (!label) {
          if (auth.type === 'bearer') label = 'Bearer Token';
          else if (auth.type === 'apiKey') label = 'API Key';
          else if (auth.type === 'basic') label = 'Basic Auth';
          else if (auth.type === 'oauth2') label = 'OAuth 2.0';
          else if (auth.type === 'openIdConnect') label = 'OpenID Connect';
          else label = auth.type;
        }
        
        return { value, label, originalType: auth.type, name: auth.name };
      });
      
      // Merge Swagger file auth types with default types
      // If Swagger file has specific types, use those; otherwise keep defaults
      if (mappedTypes.length > 0) {
        // Merge: add Swagger types, but keep defaults that aren't in Swagger
        const mergedTypes = [...mappedTypes];
        DEFAULT_AUTH_TYPES.forEach(defaultType => {
          if (!mappedTypes.find(t => t.value === defaultType.value)) {
            mergedTypes.push(defaultType);
          }
        });
        setAuthorizationTypes(mergedTypes);
        
        // If only one type in Swagger, auto-select it
        if (mappedTypes.length === 1) {
          setSelectedAuthType(mappedTypes[0].value);
        }
      } else {
        // No auth types in Swagger file, use defaults
        setAuthorizationTypes(DEFAULT_AUTH_TYPES);
      }
    } catch (error) {
      console.error('Failed to load authorization types:', error);
      setMessage({ type: 'warning', text: 'Could not load authorization types from Swagger file. Using default types.' });
      // Fallback to default types
      setAuthorizationTypes(DEFAULT_AUTH_TYPES);
    } finally {
      setLoadingAuthTypes(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setMessage({ type: 'warning', text: 'Please select a Swagger file' });
      return;
    }

    if (!selectedAuthType) {
      setMessage({ type: 'warning', text: 'Please select an authorization type' });
      return;
    }

    // Validate authorization values based on type
    if (selectedAuthType === 'apiKey' && (!authValues.apiKey.key || !authValues.apiKey.value)) {
      setMessage({ type: 'warning', text: 'Please provide API Key name and value' });
      return;
    }
    if (selectedAuthType === 'basic' && (!authValues.basic.username || !authValues.basic.password)) {
      setMessage({ type: 'warning', text: 'Please provide username and password for Basic Auth' });
      return;
    }
    if (selectedAuthType === 'bearer' && !authValues.bearer.token) {
      setMessage({ type: 'warning', text: 'Please provide Bearer Token' });
      return;
    }
    if (selectedAuthType === 'jwt' && !authValues.jwt.token) {
      setMessage({ type: 'warning', text: 'Please provide JWT Token' });
      return;
    }
    if (selectedAuthType === 'oauth2' && !authValues.oauth2.token) {
      setMessage({ type: 'warning', text: 'Please provide OAuth 2.0 Access Token' });
      return;
    }
    if (selectedAuthType === 'openIdConnect' && !authValues.openIdConnect.token) {
      setMessage({ type: 'warning', text: 'Please provide OpenID Connect Token' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiService.post('/api/conversions/convert', {
        swagger_file_id: selectedFile,
        include_xss: injections.xss,
        include_sql: injections.sql,
        include_html: injections.html,
        authorization_type: selectedAuthType,
        authorization_values: authValues[selectedAuthType],
        environments: Object.keys(environments).filter(env => environments[env]),
      });

      setMessage({ type: 'success', text: 'Conversion started successfully!' });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Conversion failed' });
    } finally {
      setLoading(false);
    }
  };

  const renderAuthInputs = () => {
    if (!selectedAuthType) {
      return null;
    }

    switch (selectedAuthType) {
      case 'apiKey':
        return (
          <div>
            <Form.Group className="mb-3">
              <Form.Label>API Key Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., X-API-Key, api_key"
                value={authValues.apiKey.key}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, key: e.target.value }
                })}
              />
              <Form.Text className="text-muted">
                The name of the header or query parameter
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API Key Value</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your API key"
                value={authValues.apiKey.value}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, value: e.target.value }
                })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Select
                value={authValues.apiKey.location}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, location: e.target.value }
                })}
              >
                <option value="header">Header</option>
                <option value="query">Query Parameter</option>
              </Form.Select>
            </Form.Group>
          </div>
        );

      case 'basic':
        return (
          <div>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter username"
                value={authValues.basic.username}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  basic: { ...authValues.basic, username: e.target.value }
                })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={authValues.basic.password}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  basic: { ...authValues.basic, password: e.target.value }
                })}
              />
            </Form.Group>
          </div>
        );

      case 'bearer':
        return (
          <Form.Group className="mb-3">
            <Form.Label>Bearer Token</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter bearer token"
              value={authValues.bearer.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                bearer: { ...authValues.bearer, token: e.target.value }
              })}
            />
            <Form.Text className="text-muted">
              The bearer token value (without "Bearer " prefix)
            </Form.Text>
          </Form.Group>
        );

      case 'jwt':
        return (
          <Form.Group className="mb-3">
            <Form.Label>JWT Token</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter JWT token"
              value={authValues.jwt.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                jwt: { ...authValues.jwt, token: e.target.value }
              })}
              as="textarea"
              rows={3}
            />
            <Form.Text className="text-muted">
              Paste your JWT token here
            </Form.Text>
          </Form.Group>
        );

      case 'oauth2':
        return (
          <Form.Group className="mb-3">
            <Form.Label>OAuth 2.0 Access Token</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter OAuth 2.0 access token"
              value={authValues.oauth2.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                oauth2: { ...authValues.oauth2, token: e.target.value }
              })}
              as="textarea"
              rows={3}
            />
            <Form.Text className="text-muted">
              Paste your OAuth 2.0 access token here
            </Form.Text>
          </Form.Group>
        );

      case 'openIdConnect':
        return (
          <Form.Group className="mb-3">
            <Form.Label>OpenID Connect Token</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter OpenID Connect token"
              value={authValues.openIdConnect.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                openIdConnect: { ...authValues.openIdConnect, token: e.target.value }
              })}
              as="textarea"
              rows={3}
            />
            <Form.Text className="text-muted">
              Paste your OpenID Connect token here
            </Form.Text>
          </Form.Group>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <h2 className="mb-4">Swagger Converter</h2>
      
      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Convert Swagger to Postman</h5>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Swagger File</Form.Label>
              <Form.Select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
              >
                <option value="">-- Select a Swagger file --</option>
                {swaggerFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Authorization Type</Form.Label>
              <Form.Select
                value={selectedAuthType}
                onChange={(e) => setSelectedAuthType(e.target.value)}
                disabled={loadingAuthTypes}
              >
                <option value="">
                  {loadingAuthTypes
                    ? '-- Loading authorization types... --'
                    : '-- Select authorization type --'}
                </option>
                {authorizationTypes.map((authType, index) => (
                  <option key={authType.value + index} value={authType.value}>
                    {authType.label}
                  </option>
                ))}
              </Form.Select>
              {loadingAuthTypes && (
                <Form.Text className="text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading authorization types from Swagger file...
                </Form.Text>
              )}
              {!loadingAuthTypes && selectedFile && (
                <Form.Text className="text-muted">
                  All authorization types are shown. Types from the Swagger file are prioritized.
                </Form.Text>
              )}
            </Form.Group>

            {selectedAuthType && (
              <Card className="mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                <Card.Body>
                  <Card.Title className="h6 mb-3">Authorization Configuration</Card.Title>
                  {renderAuthInputs()}
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Security Injections</Form.Label>
              <div>
                <Form.Check
                  type="checkbox"
                  label="XSS Injections"
                  checked={injections.xss}
                  onChange={(e) => setInjections({ ...injections, xss: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="SQL Injections"
                  checked={injections.sql}
                  onChange={(e) => setInjections({ ...injections, sql: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="HTML Injections"
                  checked={injections.html}
                  onChange={(e) => setInjections({ ...injections, html: e.target.checked })}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Environment Files</Form.Label>
              <div>
                <Form.Check
                  type="checkbox"
                  label="Local"
                  checked={environments.local}
                  onChange={(e) => setEnvironments({ ...environments, local: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="Dev"
                  checked={environments.dev}
                  onChange={(e) => setEnvironments({ ...environments, dev: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="QA"
                  checked={environments.qa}
                  onChange={(e) => setEnvironments({ ...environments, qa: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="UAT"
                  checked={environments.uat}
                  onChange={(e) => setEnvironments({ ...environments, uat: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="PROD"
                  checked={environments.prod}
                  onChange={(e) => setEnvironments({ ...environments, prod: e.target.checked })}
                />
              </div>
            </Form.Group>

            <Button
              variant="primary"
              onClick={handleConvert}
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Converting...
                </>
              ) : (
                'Convert'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SwaggerConverter;
