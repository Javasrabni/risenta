'use client';

import { useState } from 'react';
import { DocumentTemplate, DOCUMENT_TEMPLATES } from '@/types/write';
import { X } from 'lucide-react';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
}

export default function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<DocumentTemplate | null>(null);

  if (!isOpen) return null;

  const templates = Object.values(DOCUMENT_TEMPLATES);
  const displayTemplate = hoveredTemplate || selectedTemplate;

  const handleSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setSelectedTemplate(null);
      setHoveredTemplate(null);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setHoveredTemplate(null);
    onClose();
  };

  return (
    <div className="template-modal-overlay" onClick={handleClose}>
      <div className="template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal-header">
          <h2>Pilih Template Dokumen</h2>
          <button className="template-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="template-modal-content">
          <div className="template-grid">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                onClick={() => handleSelect(template.id)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                <div className="template-card-icon">{template.icon}</div>
                <div className="template-card-name">{template.name}</div>
                <div className="template-card-desc">{template.description}</div>
              </div>
            ))}
          </div>

          {displayTemplate && (
            <div className="template-preview">
              <h3>{DOCUMENT_TEMPLATES[displayTemplate].name}</h3>
              <p className="template-preview-desc">
                {DOCUMENT_TEMPLATES[displayTemplate].description}
              </p>
              
              <div className="template-sections">
                <h4>Struktur Dokumen:</h4>
                <ul>
                  {DOCUMENT_TEMPLATES[displayTemplate].sections.map((section) => (
                    <li key={section.id}>
                      <strong>{section.title}</strong>
                      {section.description && (
                        <span className="section-desc"> — {section.description}</span>
                      )}
                    </li>
                  ))}
                  {DOCUMENT_TEMPLATES[displayTemplate].sections.length === 0 && (
                    <li className="no-sections">Dokumen kosong — bebas menulis</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="template-modal-footer">
          <button className="btn-secondary" onClick={handleClose}>
            Batal
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={!selectedTemplate}
          >
            Buat Dokumen
          </button>
        </div>
      </div>
    </div>
  );
}
