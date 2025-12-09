import React from 'react';
import { Navbar } from 'react-bootstrap';

const Header = ({ onToggleSidebar }) => {
  return (
    <Navbar bg="light" expand="lg" className="border-bottom">
      <Navbar.Brand className="ms-3">
        <i className="bi bi-list me-2" onClick={onToggleSidebar} style={{ cursor: 'pointer' }}></i>
        Swagger to Postman Converter
      </Navbar.Brand>
    </Navbar>
  );
};

export default Header;
