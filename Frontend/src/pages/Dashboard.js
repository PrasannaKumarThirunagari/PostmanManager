import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api.service';

const Dashboard = () => {
  const [stats, setStats] = useState({
    swaggerFiles: 0,
    collections: 0,
    environments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Fetch all stats in parallel
      const [swaggerResponse, collectionsResponse, environmentsResponse] = await Promise.all([
        apiService.get('/api/swagger/files').catch(() => ({ files: [] })),
        apiService.get('/api/collections').catch(() => ({ collections: [] })),
        apiService.get('/api/environments').catch(() => ({ environments: [] }))
      ]);

      setStats({
        swaggerFiles: swaggerResponse.files?.length || 0,
        collections: collectionsResponse.collections?.length || 0,
        environments: environmentsResponse.environments?.length || 0
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Keep default values (0) on error
    } finally {
      setLoading(false);
    }
  };
  const cards = [
    {
      title: 'Swagger Converter',
      description: 'Convert Swagger/OpenAPI files to Postman collections',
      icon: 'bi-file-earmark-code',
      link: '/swagger',
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Manage Swagger',
      description: 'Upload and manage your Swagger specification files',
      icon: 'bi-folder',
      link: '/manage-swagger',
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Postman Manager',
      description: 'View and manage generated Postman collections',
      icon: 'bi-collection',
      link: '/postman',
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Collection Editor',
      description: 'Edit and customize Postman collection requests',
      icon: 'bi-pencil-square',
      link: '/collection-editor',
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Grid Filtering',
      description: 'Generate filtered requests based on response attributes',
      icon: 'bi-grid-3x3-gap',
      link: '/grid-filtering',
      gradient: 'from-indigo-500 to-blue-500',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Filtering Conditions',
      description: 'Configure filtering conditions master data',
      icon: 'bi-sliders',
      link: '/filtering-conditions',
      gradient: 'from-teal-500 to-cyan-500',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Welcome to API Management
        </h1>
        <p className="text-slate-600 text-lg">
          Convert, manage, and enhance your API documentation with ease
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Swagger Files</p>
              <p className="text-3xl font-bold text-slate-900">
                {loading ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  stats.swaggerFiles
                )}
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="bi bi-file-earmark-code text-blue-600 text-2xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Collections</p>
              <p className="text-3xl font-bold text-slate-900">
                {loading ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  stats.collections
                )}
              </p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="bi bi-collection text-green-600 text-2xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Environments</p>
              <p className="text-3xl font-bold text-slate-900">
                {loading ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  stats.environments
                )}
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
              <i className="bi bi-globe text-purple-600 text-2xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className="group block bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`h-2 bg-gradient-to-r ${card.gradient}`}></div>
              <div className="p-6">
                <div className={`w-14 h-14 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`bi ${card.icon} ${card.iconColor} text-2xl`}></i>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                  {card.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all duration-200">
                  <span>Get started</span>
                  <i className="bi bi-arrow-right ml-2 group-hover:ml-4 transition-all duration-200"></i>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="bi bi-lightbulb text-2xl"></i>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Getting Started</h3>
            <p className="text-blue-100 mb-4 leading-relaxed">
              New to the platform? Start by uploading a Swagger file, then convert it to a Postman collection. 
              Use the Grid Filtering feature to generate comprehensive test cases automatically.
            </p>
            <div className="flex gap-3">
              <Link
                to="/manage-swagger"
                className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors duration-200 shadow-lg"
              >
                Upload Swagger
              </Link>
              <Link
                to="/swagger"
                className="bg-white/20 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-white/30 transition-colors duration-200 border border-white/30"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
