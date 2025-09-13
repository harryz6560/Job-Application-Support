import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { JobApplication } from '../types';
import { Button } from './ui/Button';
import axios from 'axios';

interface HtmlViewerProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HtmlViewer: React.FC<HtmlViewerProps> = ({ application, isOpen, onClose }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (application && isOpen) {
      fetchHtmlContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, isOpen]);

  const fetchHtmlContent = async () => {
    if (!application) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`http://localhost:8000/applications/${application.id}/html`);
      setHtmlContent(response.data.html_content);
    } catch (err) {
      setError('Failed to load HTML content');
      console.error('Error fetching HTML:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!application) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative bg-background rounded-lg border shadow-xl ${
              isFullscreen 
                ? 'w-[95vw] h-[95vh]' 
                : 'w-full max-w-6xl h-[85vh]'
            } flex flex-col overflow-hidden mx-4`}
          >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{application.job_title}</h2>
            <p className="text-sm text-muted-foreground">{application.company_name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(application.job_url, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Original
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button onClick={fetchHtmlContent} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            </div>
          ) : htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-forms"
              title={`${application.company_name} - ${application.job_title}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No content available</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};