# Request Body Attribute Mapping Guide

## Overview
This guide explains what values to provide for each mapping mode in the Request Body Attribute Mapping interface.

---

## Mapping Modes Explained

### 1. **No Mapping** (mode: "none")
**When to use:** When you want to keep the original value from the request body unchanged.

**What to provide:** Nothing - just leave it as "No Mapping"

**Example:**
- Request field: `id`
- Mode: No Mapping
- Result: The `id` field will keep its original value from the request

---

### 2. **From Response** (mode: "response")
**When to use:** When you want to populate a request field with a value from a response attribute.

**What to provide:** Select a response attribute from the dropdown

**Available options:** All response attributes extracted from the response body

**Example:**
- Request field: `userId`
- Mode: From Response
- Source: `id` (response attribute)
- Result: `userId` will be populated with the value from the `id` response attribute

**Common use cases:**
- Mapping response IDs to request fields
- Mapping response data to filter/search fields
- Mapping response values to update/create fields

---

### 3. **Manual Value** (mode: "manual")
**When to use:** When you want to set a fixed/constant value for a request field.

**What to provide:** Enter any text value directly

**Example values:**
- `"Portfolio"` - String value
- `123` - Number value
- `true` - Boolean value
- `"2024-01-01"` - Date string
- `"{{baseUrl}}"` - Postman variable
- `""` - Empty string

**Example:**
- Request field: `objectType`
- Mode: Manual Value
- Value: `"Portfolio"`
- Result: All generated requests will have `objectType: "Portfolio"`

**Common use cases:**
- Setting fixed object types
- Setting default values
- Setting environment-specific values
- Setting constant identifiers

---

### 4. **Special Value** (mode: "special")
**When to use:** When you want to use system-generated values that change per generated request.

**What to provide:** Select one of the special values from the dropdown

**Available Special Values:**

#### a. **Attribute Name** (source: "attributeName")
**What it does:** Uses the name of the current response attribute being processed

**Example:**
- Request field: `filterField`
- Mode: Special Value
- Source: Attribute Name
- Result: If processing `userId` attribute, `filterField` = `"userId"`

**Use case:** When you want the request field to contain the name of the attribute being filtered

---

#### b. **Object Type** (source: "objectType")
**What it does:** Uses the user-provided Object Type value from Section 3

**Example:**
- Request field: `objectType`
- Mode: Special Value
- Source: Object Type
- User input (Section 3): `"Portfolio"`
- Result: `objectType` = `"Portfolio"` in all requests

**Use case:** When you want to use the Object Type value you entered in the UI

---

#### c. **Data Type** (source: "dataType")
**What it does:** Uses the data type of the current response attribute (string, number, integer, boolean, etc.)

**Example:**
- Request field: `type`
- Mode: Special Value
- Source: Data Type
- Current attribute type: `"string"`
- Result: `type` = `"string"`

**Use case:** When you need to include the data type in the request

---

#### d. **Condition** (source: "condition")
**What it does:** Uses the filtering condition being applied (EQ, NEQ, Contains, GT, LT, etc.)

**Example:**
- Request field: `operator`
- Mode: Special Value
- Source: Condition
- Current condition: `"EQ"`
- Result: `operator` = `"EQ"`

**Use case:** When you want to include the condition/operator in the request body

---

#### e. **Attribute Value** (source: "attributeValue")
**What it does:** Uses the template `{{attributeValue}}` (Postman variable)

**Example:**
- Request field: `value`
- Mode: Special Value
- Source: Attribute Value
- Result: `value` = `"{{attributeValue}}"`

**Use case:** When you want to use a Postman variable that will be set at runtime

---

## Complete Example Scenarios

### Scenario 1: Filtering API Request
**Request Body Structure:**
```json
{
  "filterField": "",
  "operator": "",
  "value": "",
  "objectType": ""
}
```

**Mappings:**
1. `filterField` → **Special Value** → **Attribute Name**
   - Result: Contains the attribute name (e.g., "userId")

2. `operator` → **Special Value** → **Condition**
   - Result: Contains the condition (e.g., "EQ", "NEQ")

3. `value` → **Special Value** → **Attribute Value**
   - Result: Contains `"{{attributeValue}}"` template

4. `objectType` → **Special Value** → **Object Type**
   - Result: Contains user input (e.g., "Portfolio")

**Generated Request Example:**
```json
{
  "filterField": "userId",
  "operator": "EQ",
  "value": "{{attributeValue}}",
  "objectType": "Portfolio"
}
```

---

### Scenario 2: Update API Request
**Request Body Structure:**
```json
{
  "id": "",
  "name": "",
  "status": "active"
}
```

**Mappings:**
1. `id` → **From Response** → `userId`
   - Result: Gets value from `userId` response attribute

2. `name` → **From Response** → `userName`
   - Result: Gets value from `userName` response attribute

3. `status` → **Manual Value** → `"active"`
   - Result: Always `"active"` (no mapping needed, but you can set it)

**Generated Request Example:**
```json
{
  "id": "12345",
  "name": "John Doe",
  "status": "active"
}
```

---

### Scenario 3: Search API Request
**Request Body Structure:**
```json
{
  "searchField": "",
  "searchValue": "",
  "dataType": ""
}
```

**Mappings:**
1. `searchField` → **Special Value** → **Attribute Name**
   - Result: Attribute name (e.g., "email")

2. `searchValue` → **From Response** → `email`
   - Result: Value from `email` response attribute

3. `dataType` → **Special Value** → **Data Type**
   - Result: Data type (e.g., "string")

**Generated Request Example:**
```json
{
  "searchField": "email",
  "searchValue": "user@example.com",
  "dataType": "string"
}
```

---

## Quick Reference Table

| Mapping Mode | What to Provide | When to Use |
|-------------|----------------|-------------|
| **No Mapping** | Nothing | Keep original value |
| **From Response** | Select response attribute | Map from response data |
| **Manual Value** | Enter text/number | Set fixed value |
| **Special Value** | Select special type | Use system-generated value |

---

## Special Value Options Reference

| Special Value | What It Contains | Example Output |
|--------------|------------------|----------------|
| **Attribute Name** | Name of current attribute | `"userId"`, `"email"`, `"name"` |
| **Object Type** | User input from Section 3 | `"Portfolio"`, `"User"`, `"Product"` |
| **Data Type** | Type of attribute | `"string"`, `"number"`, `"boolean"` |
| **Condition** | Filtering condition | `"EQ"`, `"NEQ"`, `"Contains"`, `"GT"` |
| **Attribute Value** | Postman variable template | `"{{attributeValue}}"` |

---

## Tips and Best Practices

1. **Use "No Mapping"** for fields that should remain unchanged
2. **Use "From Response"** when you need actual data values from the response
3. **Use "Manual Value"** for constants, defaults, or fixed values
4. **Use "Special Value"** for dynamic system values that change per request
5. **Enable/Disable** mappings to control which fields are updated
6. **Test your mappings** by generating a small set of requests first

---

## Common Patterns

### Pattern 1: Filter Request
```
filterField → Special: Attribute Name
operator → Special: Condition
value → Special: Attribute Value
```

### Pattern 2: Update Request
```
id → From Response: id
name → From Response: name
status → Manual: "active"
```

### Pattern 3: Search Request
```
field → Special: Attribute Name
value → From Response: [same attribute]
type → Special: Data Type
```

---

**Need Help?** If you're unsure which value to use, start with "No Mapping" and test. Then gradually add mappings based on your API requirements.

