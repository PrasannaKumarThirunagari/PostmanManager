## Fixes Applied

### 5. **Default API Configuration Variables**: Added a dedicated tab for managing default API configuration variables that will be used as default values when generating environment variables. Users can configure environment-specific settings including:

- **API Name** - Must match the API name used in Swagger conversion
- **Environment** - Select from Local, Development, QA, UAT, or Production
- **Base URL** - API base URL for each environment
- **API Key** - Default API key values
- **Origin** - CORS origin settings
- **Custom Variables** - Users can add custom variables and their values

**How it works:**
- When an API is converted from Swagger to Postman, the system automatically matches:
  - API name (from Swagger `info.title`)
  - Environment (local, dev, qa, uat, prod)
  - Variable names (baseUrl, apiKey, and any custom variables)
- If a match is found, the default values are automatically applied to the generated environment variables
- If no match is found, the system falls back to generating default values based on variable names

These default configurations are stored in the `Backend\MasterData\default_api_configs.json` file and are automatically applied when creating new environment files, ensuring consistency across different environments and reducing manual configuration effort.

