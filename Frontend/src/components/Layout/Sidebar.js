import React from 'react';
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
    <div className="sidebar h-full flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <i className="bi bi-arrow-repeat text-white text-lg"></i>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h5 className="text-white font-bold text-sm mb-0 whitespace-nowrap">
                Swagger Converter
              </h5>
              <p className="text-slate-400 text-xs mb-0">API Tools</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <i className={`bi ${item.icon} text-lg flex-shrink-0`}></i>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="p-4 border-t border-slate-700">
          <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-lg p-3 border border-blue-500/30">
            <p className="text-slate-300 text-xs font-medium mb-1">Quick Tips</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Use the converter to transform Swagger files into Postman collections quickly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
