import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';

const Dashboard = () => {
  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>
      <Row>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>
                <i className="bi bi-file-earmark-code me-2"></i>
                Swagger Files
              </Card.Title>
              <Card.Text>
                Manage your Swagger/OpenAPI specification files
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>
                <i className="bi bi-collection me-2"></i>
                Postman Collections
              </Card.Title>
              <Card.Text>
                View and manage generated Postman collections
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>
                <i className="bi bi-gear me-2"></i>
                Settings
              </Card.Title>
              <Card.Text>
                Configure application settings
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
