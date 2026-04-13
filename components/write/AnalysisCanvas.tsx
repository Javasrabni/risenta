'use client';

import { useState, useEffect, memo } from 'react';
import { AnalysisData } from '@/types/write';

interface AnalysisCanvasProps {
  content: string;
  topic: string;
  isVisible: boolean;
  onClose: () => void;
  aiProvider: 'gemini' | 'openrouter';
  persistedAnalysis?: AnalysisData | null;
  onAnalysisGenerated?: (analysis: AnalysisData) => void;
}

function AnalysisCanvas({
  content,
  topic,
  isVisible,
  onClose,
  aiProvider,
  persistedAnalysis,
  onAnalysisGenerated,
}: AnalysisCanvasProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(persistedAnalysis || null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'recommendations'>('overview');

  // Use persisted analysis if available
  useEffect(() => {
    if (persistedAnalysis) {
      setAnalysis(persistedAnalysis);
    }
  }, [persistedAnalysis]);

  useEffect(() => {
    if (isVisible && content && !analysis && !persistedAnalysis) {
      generateAnalysis();
    }
  }, [isVisible, content, persistedAnalysis]);

  const generateAnalysis = async () => {
    setIsLoading(true);
    try {
      const apiEndpoint = aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analyze-content',
          content,
          topic,
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        // Notify parent that analysis was generated
        onAnalysisGenerated?.(data.analysis);
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="analysis-canvas">
      <div className="analysis-canvas-header">
        <h3>📊 Analisis Tulisan</h3>
        <button className="analysis-close-btn" onClick={onClose}>×</button>
      </div>

      {isLoading ? (
        <div className="analysis-loading">
          <div className="analysis-spinner" />
          <p>Menganalisis tulisan...</p>
        </div>
      ) : analysis ? (
        <>
          <div className="analysis-tabs">
            <button
              className={`analysis-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`analysis-tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              Pertanyaan
            </button>
            <button
              className={`analysis-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Rekomendasi
            </button>
          </div>

          <div className="analysis-content">
            {activeTab === 'overview' && (
              <>
                <div className="analysis-score-section">
                  <div className="analysis-score-circle">
                    <span className="analysis-score-value">{analysis.overallScore}</span>
                    <span className="analysis-score-label">/100</span>
                  </div>
                  <p className="analysis-score-text">
                    {analysis.overallScore >= 80 ? 'Sangat Baik' :
                     analysis.overallScore >= 60 ? 'Baik' :
                     analysis.overallScore >= 40 ? 'Cukup' : 'Perlu Perbaikan'}
                  </p>
                </div>

                <div className="analysis-section">
                  <h4 className="analysis-section-title strength">💪 Kekuatan</h4>
                  <ul className="analysis-list">
                    {analysis.strengths.map((item, idx) => (
                      <li key={idx} className="analysis-item positive">
                        <span className="analysis-bullet">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h4 className="analysis-section-title weakness">⚠️ Kelemahan & Celah</h4>
                  <ul className="analysis-list">
                    {analysis.weaknesses.map((item, idx) => (
                      <li key={idx} className="analysis-item negative">
                        <span className="analysis-bullet">!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'questions' && (
              <div className="analysis-section">
                <h4 className="analysis-section-title">❓ Prediksi Pertanyaan Dosen/Panitia</h4>
                <p className="analysis-section-subtitle">
                  Pertanyaan yang mungkin ditanyakan saat presentasi atau sidang:
                </p>
                <ul className="analysis-list questions">
                  {analysis.predictedQuestions.map((item, idx) => (
                    <li key={idx} className="analysis-item question">
                      <span className="analysis-number">{idx + 1}</span>
                      <span className="analysis-question-text">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="analysis-section">
                <h4 className="analysis-section-title">💡 Rekomendasi Perbaikan</h4>
                <ul className="analysis-list">
                  {analysis.recommendations.map((item, idx) => (
                    <li key={idx} className="analysis-item recommendation">
                      <span className="analysis-bullet">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="analysis-error">
          <p>Gagal memuat analisis. Silakan coba lagi.</p>
          <button className="btn btn-sm" onClick={generateAnalysis}>
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(AnalysisCanvas);
