import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Container fluid className="p-0">
      <Row className="g-0">
        <Col xs={12} md={3} lg={2} className="sidebar p-0">
          <Sidebar collapsed={sidebarCollapsed} />
        </Col>
        <Col xs={12} md={9} lg={10} className="main-content">
          <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <div className="p-4">
            {children}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Layout;
