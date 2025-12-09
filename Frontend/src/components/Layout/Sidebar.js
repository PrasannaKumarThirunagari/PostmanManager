import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ collapsed }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
    { path: '/swagger', icon: 'bi-file-earmark-code', label: 'Swagger Converter' },
    { path: '/manage-swagger', icon: 'bi-folder', label: 'Manage Swagger' },
    { path: '/postman', icon: 'bi-collection', label: 'Postman Manager' },
    { path: '/collection-editor', icon: 'bi-pencil-square', label: 'Collection Editor' },
    { path: '/grid-filtering', icon: 'bi-grid-3x3-gap', label: 'Grid Filtering' },
    { path: '/filtering-conditions', icon: 'bi-sliders', label: 'Filtering Conditions' },
  ];

  return (
    <div className="sidebar h-100">
      <div className="p-3 border-bottom">
        <h5 className="mb-0">
          <i className="bi bi-arrow-repeat me-2"></i>
          {!collapsed && 'Swagger Converter'}
        </h5>
      </div>
      <Nav className="flex-column p-3">
        {menuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={Link}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <i className={`bi ${item.icon} me-2`}></i>
            {!collapsed && item.label}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
};

export default Sidebar;
