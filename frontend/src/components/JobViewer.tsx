import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, ExternalLink, FileText, Code, Calendar, MapPin, Building, User } from 'lucide-react';
import { JobApplication } from '../types';
import { Button } from './ui/Button';
import axios from 'axios';
import { format } from 'date-fns';

interface JobViewerProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'formatted' | 'html';

export const JobViewer: React.FC<JobViewerProps> = ({ application, isOpen, onClose }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');

  useEffect(() => {
    if (application && isOpen && viewMode === 'html') {
      fetchHtmlContent();
    }
  }, [application, isOpen, viewMode]);

  const fetchHtmlContent = async () => {
    if (!application) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`http://localhost:8000/applications/${application.id}/html`);
      setHtmlContent(response.data.html_content);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load HTML content');
      console.error('Error fetching HTML:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const switchViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'formatted') {
      setError('');
      setHtmlContent('');
    }
  };

  if (!application) return null;

  const renderFormattedView = () => (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header Section */}
      <div className="border-b pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {application.job_title}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="font-medium">{application.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Applied {format(new Date(application.application_date), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
              application.status === 'interview' ? 'bg-yellow-100 text-yellow-800' :
              application.status === 'offer' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(application.job_url, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Original
          </Button>
          <span className="text-sm text-muted-foreground">
            Source: <span className="font-medium capitalize">{application.source_site}</span>
          </span>
        </div>
      </div>

      {/* Job Description */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Job Description
        </h2>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            {application.job_description ? (
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {application.job_description}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No description available</p>
            )}
          </div>
        </div>
      </div>

      {/* Application Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Application Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono text-xs">{application.id}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(application.created_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-3">Technical Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">HTML Snapshot:</span>
              <span className={application.html_snapshot_path ? 'text-green-600' : 'text-red-600'}>
                {application.html_snapshot_path ? 'Available' : 'Not available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* URL */}
      <div>
        <h3 className="font-semibold mb-3">Job URL</h3>
        <div className="bg-muted/50 rounded-lg p-3">
          <a
            href={application.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm break-all"
          >
            {application.job_url}
          </a>
        </div>
      </div>
    </div>
  );

  const renderHtmlView = () => (
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
          <div className="text-center p-6">
            <p className="text-destructive mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={fetchHtmlContent} variant="outline" size="sm">
                Try Again
              </Button>
              <p className="text-sm text-muted-foreground">
                The HTML snapshot might not be available for this job.
              </p>
            </div>
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
          <p className="text-muted-foreground">No HTML content available</p>
        </div>
      )}
    </div>
  );

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
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{application.job_title}</h2>
                  <p className="text-sm text-muted-foreground">{application.company_name}</p>
                </div>
                
                {/* View Mode Selector */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <button
                    onClick={() => switchViewMode('formatted')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'formatted'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Details
                  </button>
                  <button
                    onClick={() => switchViewMode('html')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'html'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Code className="h-4 w-4" />
                    HTML
                  </button>
                </div>
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
            {viewMode === 'formatted' ? renderFormattedView() : renderHtmlView()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};