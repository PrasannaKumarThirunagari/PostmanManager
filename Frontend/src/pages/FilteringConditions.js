import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Table, Badge, Modal, Row, Col } from 'react-bootstrap';
import apiService from '../services/api.service';

const FilteringConditions = () => {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [formData, setFormData] = useState({
    dataType: 'string',
    key: '',
    value: '',
    enabled: true,
    description: ''
  });

  const dataTypes = ['string', 'number', 'integer', 'boolean', 'date', 'datetime'];

  useEffect(() => {
    loadConditions();
  }, []);

  const loadConditions = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/filtering-conditions');
      setConditions(response.conditions || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to load conditions' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (condition = null) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        dataType: condition.dataType || 'string',
        key: condition.key || '',
        value: condition.value || '',
        enabled: condition.enabled !== undefined ? condition.enabled : true,
        description: condition.description || ''
      });
    } else {
      setEditingCondition(null);
      setFormData({
        dataType: 'string',
        key: '',
        value: '',
        enabled: true,
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCondition(null);
    setFormData({
      dataType: 'string',
      key: '',
      value: '',
      enabled: true,
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.key.trim()) {
      setMessage({ type: 'danger', text: 'Key is required' });
      return;
    }

    try {
      if (editingCondition) {
        // Update
        await apiService.put(`/api/filtering-conditions/${editingCondition.id}`, formData);
        setMessage({ type: 'success', text: 'Condition updated successfully' });
      } else {
        // Create
        await apiService.post('/api/filtering-conditions', formData);
        setMessage({ type: 'success', text: 'Condition created successfully' });
      }
      handleCloseModal();
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to save condition' });
    }
  };

  const handleDelete = async (conditionId) => {
    if (!window.confirm('Are you sure you want to delete this condition?')) {
      return;
    }

    try {
      await apiService.delete(`/api/filtering-conditions/${conditionId}`);
      setMessage({ type: 'success', text: 'Condition deleted successfully' });
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to delete condition' });
    }
  };

  const handleToggle = async (conditionId) => {
    try {
      await apiService.patch(`/api/filtering-conditions/${conditionId}/toggle`);
      setMessage({ type: 'success', text: 'Condition status updated' });
      await loadConditions();
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to toggle condition' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiService.get('/api/filtering-conditions/export');
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `filtering_conditions_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Conditions exported successfully' });
    } catch (error) {
      setMessage({ type: 'danger', text: error.message || 'Failed to export conditions' });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await apiService.post('/api/filtering-conditions/import', data);
        setMessage({ type: 'success', text: 'Conditions imported successfully' });
        await loadConditions();
      } catch (error) {
        setMessage({ type: 'danger', text: error.message || 'Failed to import conditions' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  // Group conditions by dataType
  const groupedConditions = conditions.reduce((acc, condition) => {
    const dataType = condition.dataType || 'other';
    if (!acc[dataType]) {
      acc[dataType] = [];
    }
    acc[dataType].push(condition);
    return acc;
  }, {});

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Filtering Conditions Master Data</h2>
        <div>
          <Button variant="outline-primary" onClick={handleExport} className="me-2">
            <i className="bi bi-download me-2"></i>Export
          </Button>
          <label className="btn btn-outline-secondary me-2">
            <i className="bi bi-upload me-2"></i>Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-circle me-2"></i>Add Condition
          </Button>
        </div>
      </div>

      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div>
          {Object.keys(groupedConditions).length === 0 ? (
            <Card>
              <Card.Body className="text-center py-5">
                <p className="text-muted">No conditions found. Click "Add Condition" to create one.</p>
              </Card.Body>
            </Card>
          ) : (
            Object.keys(groupedConditions).map((dataType) => (
              <Card key={dataType} className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">
                    <Badge bg="primary" className="me-2">{dataType.toUpperCase()}</Badge>
                    {groupedConditions[dataType].length} condition(s)
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedConditions[dataType].map((condition) => (
                        <tr key={condition.id}>
                          <td><strong>{condition.key}</strong></td>
                          <td><code>{condition.value || '(empty)'}</code></td>
                          <td>{condition.description || '-'}</td>
                          <td>
                            <Badge bg={condition.enabled ? 'success' : 'secondary'}>
                              {condition.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleOpenModal(condition)}
                              className="me-1"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant={condition.enabled ? 'outline-warning' : 'outline-success'}
                              size="sm"
                              onClick={() => handleToggle(condition.id)}
                              className="me-1"
                            >
                              <i className={`bi ${condition.enabled ? 'bi-toggle-off' : 'bi-toggle-on'}`}></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(condition.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingCondition ? 'Edit Condition' : 'Add New Condition'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={formData.dataType}
                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                    required
                  >
                    {dataTypes.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Key (Condition Name) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="e.g., EQ, NEQ, Contains"
                    required
                  />
                  <Form.Text className="text-muted">
                    The condition identifier (e.g., EQ, NEQ, GT, LT, Contains)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Value</Form.Label>
              <Form.Control
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., *{value}* for Contains, empty for EQ/NEQ"
              />
              <Form.Text className="text-muted">
                Filter value pattern. Use {"{value}"} as placeholder. Leave empty for exact match conditions.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of what this condition does"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                label="Enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCondition ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default FilteringConditions;

