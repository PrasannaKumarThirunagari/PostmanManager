import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-80'} transition-all duration-300 ease-in-out flex-shrink-0`}>
        <Sidebar collapsed={sidebarCollapsed} />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 w-[95%] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
