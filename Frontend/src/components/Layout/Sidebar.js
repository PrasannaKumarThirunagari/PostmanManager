import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    conversion: true,
    postman: true,
    configuration: true,
    advanced: true
  });

  const menuGroups = [
    {
      id: 'main',
      label: null, // No group header for main items
      items: [
        { path: '/', icon: 'bi-speedometer2', label: 'Dashboard' }
      ]
    },
    {
      id: 'conversion',
      label: 'Conversion',
      icon: 'bi-arrow-repeat',
      items: [
        { path: '/swagger', icon: 'bi-file-earmark-code', label: 'Swagger Converter' },
        { path: '/manage-swagger', icon: 'bi-folder', label: 'Manage Swagger' }
      ]
    },
    {
      id: 'postman',
      label: 'Postman Tools',
      icon: 'bi-collection',
      items: [
        { path: '/postman', icon: 'bi-collection', label: 'Postman Manager' },
        { path: '/collection-editor', icon: 'bi-pencil-square', label: 'Collection Editor' },
        { path: '/documentation-export', icon: 'bi-file-earmark-word', label: 'Documentation Export' }
      ]
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: 'bi-gear',
      items: [
        { path: '/global-headers', icon: 'bi-heading', label: 'Global Headers' },
        { path: '/status-scripts', icon: 'bi-code-slash', label: 'Status Scripts' },
        { path: '/default-api-configs', icon: 'bi-gear-fill', label: 'Default API Configs' },
        { path: '/injection-responses', icon: 'bi-shield-exclamation', label: 'Injection Responses' }
      ]
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: 'bi-sliders',
      items: [
        { path: '/grid-filtering', icon: 'bi-grid-3x3-gap', label: 'Grid Filtering' },
        { path: '/filtering-conditions', icon: 'bi-sliders', label: 'Filtering Conditions' }
      ]
    }
  ];

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isAnyItemActive = (items) => {
    return items.some(item => location.pathname === item.path);
  };

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
        {menuGroups.map((group) => {
          // Render main items without group header
          if (!group.label) {
            return (
              <div key={group.id} className="mb-2">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : ''}
                    >
                      <i className={`bi ${item.icon} text-lg flex-shrink-0`}></i>
                      {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          }

          // Render grouped items with collapsible header
          const isGroupExpanded = collapsed ? false : expandedGroups[group.id];
          const hasActiveItem = isAnyItemActive(group.items);

          return (
            <div key={group.id} className="mb-4">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 mb-2 rounded-lg transition-all duration-200 ${
                    hasActiveItem
                      ? 'bg-slate-700/50 text-white'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <i className={`bi ${group.icon} text-sm`}></i>
                    <span className="text-xs font-semibold uppercase tracking-wider">{group.label}</span>
                  </div>
                  <i
                    className={`bi ${isGroupExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} text-xs transition-transform duration-200`}
                  ></i>
                </button>
              )}
              {isGroupExpanded && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''} ml-2`}
                        title={collapsed ? item.label : ''}
                      >
                        <i className={`bi ${item.icon} text-lg flex-shrink-0`}></i>
                        {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
