import React from 'react';

const Header = ({ onToggleSidebar }) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 text-slate-600 hover:text-slate-900"
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list text-xl"></i>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <i className="bi bi-arrow-repeat text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Swagger to Postman Converter
            </h1>
            <p className="text-xs text-slate-500">API Management Platform</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
