import React, { useState, useEffect } from 'react';
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
  const [globalHeaders, setGlobalHeaders] = useState([]);
  const [includeGlobalHeaders, setIncludeGlobalHeaders] = useState(true);
  const [selectedGlobalHeaders, setSelectedGlobalHeaders] = useState([]);
  const [loadingGlobalHeaders, setLoadingGlobalHeaders] = useState(false);

  useEffect(() => {
    loadSwaggerFiles();
    loadGlobalHeaders();
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

  const loadGlobalHeaders = async () => {
    setLoadingGlobalHeaders(true);
    try {
      const response = await apiService.get('/api/global-headers/');
      setGlobalHeaders(response || []);
      // Select all enabled headers by default
      const enabledHeaders = (response || []).filter(h => h.enabled).map(h => h.id);
      setSelectedGlobalHeaders(enabledHeaders);
    } catch (error) {
      console.error('Failed to load global headers:', error);
      setGlobalHeaders([]);
    } finally {
      setLoadingGlobalHeaders(false);
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
        include_global_headers: includeGlobalHeaders,
        selected_global_headers: includeGlobalHeaders ? selectedGlobalHeaders : [],
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key Name</label>
              <input
                type="text"
                placeholder="e.g., X-API-Key, api_key"
                value={authValues.apiKey.key}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, key: e.target.value }
                })}
                className="input-modern"
              />
              <p className="mt-1 text-sm text-slate-500">
                The name of the header or query parameter
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">API Key Value</label>
              <input
                type="text"
                placeholder="Enter your API key"
                value={authValues.apiKey.value}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, value: e.target.value }
                })}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <select
                value={authValues.apiKey.location}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  apiKey: { ...authValues.apiKey, location: e.target.value }
                })}
                className="select-modern"
              >
                <option value="header">Header</option>
                <option value="query">Query Parameter</option>
              </select>
            </div>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={authValues.basic.username}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  basic: { ...authValues.basic, username: e.target.value }
                })}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={authValues.basic.password}
                onChange={(e) => setAuthValues({
                  ...authValues,
                  basic: { ...authValues.basic, password: e.target.value }
                })}
                className="input-modern"
              />
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bearer Token</label>
            <input
              type="text"
              placeholder="Enter bearer token"
              value={authValues.bearer.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                bearer: { ...authValues.bearer, token: e.target.value }
              })}
              className="input-modern"
            />
            <p className="mt-1 text-sm text-slate-500">
              The bearer token value (without "Bearer " prefix)
            </p>
          </div>
        );

      case 'jwt':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">JWT Token</label>
            <textarea
              placeholder="Enter JWT token"
              value={authValues.jwt.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                jwt: { ...authValues.jwt, token: e.target.value }
              })}
              rows={3}
              className="input-modern"
            />
            <p className="mt-1 text-sm text-slate-500">
              Paste your JWT token here
            </p>
          </div>
        );

      case 'oauth2':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">OAuth 2.0 Access Token</label>
            <textarea
              placeholder="Enter OAuth 2.0 access token"
              value={authValues.oauth2.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                oauth2: { ...authValues.oauth2, token: e.target.value }
              })}
              rows={3}
              className="input-modern"
            />
            <p className="mt-1 text-sm text-slate-500">
              Paste your OAuth 2.0 access token here
            </p>
          </div>
        );

      case 'openIdConnect':
        return (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">OpenID Connect Token</label>
            <textarea
              placeholder="Enter OpenID Connect token"
              value={authValues.openIdConnect.token}
              onChange={(e) => setAuthValues({
                ...authValues,
                openIdConnect: { ...authValues.openIdConnect, token: e.target.value }
              })}
              rows={3}
              className="input-modern"
            />
            <p className="mt-1 text-sm text-slate-500">
              Paste your OpenID Connect token here
            </p>
          </div>
        );

      default:
        return null;
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
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Swagger Converter</h1>
        <p className="text-slate-600">Convert your Swagger/OpenAPI specifications to Postman collections</p>
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="bi bi-arrow-repeat"></i>
            Convert Swagger to Postman
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <i className="bi bi-file-earmark-code mr-2"></i>Select Swagger File
            </label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="select-modern"
            >
              <option value="">-- Select a Swagger file --</option>
              {swaggerFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <i className="bi bi-shield-lock mr-2"></i>Authorization Type
            </label>
            <select
              value={selectedAuthType}
              onChange={(e) => setSelectedAuthType(e.target.value)}
              disabled={loadingAuthTypes}
              className="select-modern disabled:bg-slate-100 disabled:cursor-not-allowed"
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
            </select>
            {loadingAuthTypes && (
              <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading authorization types from Swagger file...
              </p>
            )}
            {!loadingAuthTypes && selectedFile && (
              <p className="mt-2 text-sm text-slate-500">
                All authorization types are shown. Types from the Swagger file are prioritized.
              </p>
            )}
          </div>

          {selectedAuthType && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className="bi bi-gear-fill text-blue-600"></i>
                Authorization Configuration
              </h3>
              {renderAuthInputs()}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <i className="bi bi-heading mr-2"></i>Global Headers
            </label>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={includeGlobalHeaders}
                  onChange={(e) => {
                    setIncludeGlobalHeaders(e.target.checked);
                    if (e.target.checked) {
                      // Select all enabled headers when enabling
                      const enabledHeaders = globalHeaders.filter(h => h.enabled).map(h => h.id);
                      setSelectedGlobalHeaders(enabledHeaders);
                    } else {
                      setSelectedGlobalHeaders([]);
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Include Global Headers</span>
              </div>
              {includeGlobalHeaders && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadingGlobalHeaders ? (
                    <p className="text-sm text-slate-500">Loading headers...</p>
                  ) : globalHeaders.length === 0 ? (
                    <p className="text-sm text-slate-500">No global headers available. Add them in the Global Headers tab.</p>
                  ) : (
                    globalHeaders.map((header) => (
                      <label
                        key={header.id}
                        className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGlobalHeaders.includes(header.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGlobalHeaders([...selectedGlobalHeaders, header.id]);
                            } else {
                              setSelectedGlobalHeaders(selectedGlobalHeaders.filter(id => id !== header.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700">{header.key}</span>
                          {header.description && (
                            <p className="text-xs text-slate-500">{header.description}</p>
                          )}
                        </div>
                        {!header.enabled && (
                          <span className="text-xs text-slate-400">(Disabled)</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <i className="bi bi-shield-exclamation mr-2"></i>Security Injections
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: 'xss', label: 'XSS Injections', icon: 'bi-bug' },
                { key: 'sql', label: 'SQL Injections', icon: 'bi-database-exclamation' },
                { key: 'html', label: 'HTML Injections', icon: 'bi-code-square' },
              ].map((injection) => (
                <label
                  key={injection.key}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={injections[injection.key]}
                    onChange={(e) => setInjections({ ...injections, [injection.key]: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <i className={`bi ${injection.icon} text-slate-600`}></i>
                    <span className="text-sm font-medium text-slate-700">{injection.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <i className="bi bi-globe mr-2"></i>Environment Files
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'local', label: 'Local', color: 'purple' },
                { key: 'dev', label: 'Dev', color: 'blue' },
                { key: 'qa', label: 'QA', color: 'yellow' },
                { key: 'uat', label: 'UAT', color: 'orange' },
                { key: 'prod', label: 'PROD', color: 'red' },
              ].map((env) => (
                <label
                  key={env.key}
                  className={`flex items-center gap-2 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-${env.color}-400 transition-all duration-200 ${
                    environments[env.key] ? `border-${env.color}-500 bg-${env.color}-50` : 'border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={environments[env.key]}
                    onChange={(e) => setEnvironments({ ...environments, [env.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{env.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleConvert}
              disabled={loading || !selectedFile}
              className="btn-primary-modern disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Converting...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Convert to Postman
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwaggerConverter;
