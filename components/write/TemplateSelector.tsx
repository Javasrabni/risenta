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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleClose}>
      <div className="bg-write-bg rounded-xl shadow-write-lg w-full max-w-[850px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-write-border bg-write-bg2">
          <h2 className="m-0 text-[18px] font-bold text-write-text">Pilih Template Dokumen</h2>
          <button className="w-8 h-8 flex items-center justify-center rounded-md border-none bg-transparent text-write-text3 hover:bg-write-bg3 hover:text-write-text cursor-pointer transition-colors" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden text-left">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 overflow-y-auto border-r border-write-border">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 rounded-write border-2 transition-all cursor-pointer flex flex-col gap-2 hover:border-write-blue hover:shadow-md ${selectedTemplate === template.id ? 'border-write-blue bg-blue-50/10' : 'border-write-border bg-write-bg'}`}
                onClick={() => handleSelect(template.id)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                <div className="text-2xl">{template.icon}</div>
                <div className="text-[14px] font-bold text-write-text">{template.name}</div>
                <div className="text-[11px] text-write-text3 leading-tight">{template.description}</div>
              </div>
            ))}
          </div>

          {displayTemplate && (
            <div className="w-full md:w-[320px] p-6 bg-write-bg2 overflow-y-auto flex flex-col gap-4 text-left">
              <h3 className="m-0 text-[16px] font-black text-write-text">{DOCUMENT_TEMPLATES[displayTemplate].name}</h3>
              <p className="text-[12px] text-write-text2 leading-relaxed m-0 pb-4 border-b border-write-border">
                {DOCUMENT_TEMPLATES[displayTemplate].description}
              </p>
              
              <div className="flex flex-col gap-2">
                <h4 className="m-0 text-[11px] uppercase tracking-wider font-bold text-write-text3">Struktur Dokumen:</h4>
                <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                  {DOCUMENT_TEMPLATES[displayTemplate].sections.map((section) => (
                    <li key={section.id} className="text-[12px] text-write-text flex flex-col gap-0.5">
                      <strong className="text-write-text font-bold">{section.title}</strong>
                      {section.description && (
                        <span className="text-[11px] text-write-text2 font-normal"> — {section.description}</span>
                      )}
                    </li>
                  ))}
                  {DOCUMENT_TEMPLATES[displayTemplate].sections.length === 0 && (
                    <li className="italic text-write-text3 text-[12px]">Dokumen kosong — bebas menulis</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 px-6 border-t border-write-border bg-write-bg2 flex justify-end gap-3">
          <button className="px-6 py-2.5 rounded-md text-[14px] font-semibold border border-write-border bg-write-bg text-write-text hover:bg-write-bg3 transition-all cursor-pointer" onClick={handleClose}>
            Batal
          </button>
          <button 
            className="px-6 py-2.5 rounded-md text-[14px] font-bold bg-write-blue text-white hover:bg-write-blue2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
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
