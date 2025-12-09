import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import SwaggerConverter from './pages/SwaggerConverter';
import ManageSwagger from './pages/ManageSwagger';
import PostmanManager from './pages/PostmanManager';
import CollectionEditor from './pages/CollectionEditor';
import GlobalHeaders from './pages/GlobalHeaders';
import DocumentationExport from './pages/DocumentationExport';
import StatusScripts from './pages/StatusScripts';
import DefaultAPIConfigs from './pages/DefaultAPIConfigs';
import InjectionResponses from './pages/InjectionResponses';
import GridFiltering from './pages/GridFiltering';
import FilteringConditions from './pages/FilteringConditions';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/swagger" element={<SwaggerConverter />} />
          <Route path="/manage-swagger" element={<ManageSwagger />} />
          <Route path="/postman" element={<PostmanManager />} />
          <Route path="/collection-editor" element={<CollectionEditor />} />
          <Route path="/global-headers" element={<GlobalHeaders />} />
          <Route path="/documentation-export" element={<DocumentationExport />} />
          <Route path="/status-scripts" element={<StatusScripts />} />
          <Route path="/default-api-configs" element={<DefaultAPIConfigs />} />
          <Route path="/injection-responses" element={<InjectionResponses />} />
          <Route path="/grid-filtering" element={<GridFiltering />} />
          <Route path="/filtering-conditions" element={<FilteringConditions />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
