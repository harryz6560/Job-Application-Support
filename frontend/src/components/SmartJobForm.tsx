import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Search, Wand2, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import axios from 'axios';

interface SmartJobFormProps {
  onSubmit: (jobData: any) => Promise<void>;
  isLoading: boolean;
}

interface ParsedData {
  job_url: string;
  source_site: string;
  job_id?: string;
  company_name?: string;
  job_title?: string;
  location?: string;
  description_preview?: string;
  suggested_titles?: string[];
}

export const SmartJobForm: React.FC<SmartJobFormProps> = ({ onSubmit, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: URL, 2: Details
  
  // Form data
  const [url, setUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  // Smart suggestions
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  
  // Loading states
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsParsing(true);
    
    try {
      // Parse URL for smart suggestions
      const response = await axios.post('http://localhost:8000/parse-url', { url });
      
      if (response.data.success) {
        const data = response.data.data;
        setParsedData(data);
        
        // Pre-fill form with parsed data
        if (data.job_title) setJobTitle(data.job_title);
        if (data.company_name) setCompanyName(data.company_name);
        if (data.location) setLocation(data.location);
        if (data.description_preview) setJobDescription(data.description_preview);
        
        // Set suggestions
        if (data.suggested_titles) setTitleSuggestions(data.suggested_titles);
        
        setStep(2);
      } else {
        setError(response.data.error || 'Failed to parse URL');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse job URL');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!jobTitle.trim() || !companyName.trim()) {
      setError('Please fill in job title and company name');
      return;
    }

    try {
      const jobData = {
        job_url: url,
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_description: jobDescription.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        status: 'applied'
      };

      await onSubmit(jobData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add job application');
    }
  };

  const handleClose = () => {
    if (!isLoading && !isParsing) {
      setIsOpen(false);
      setStep(1);
      setUrl('');
      setJobTitle('');
      setCompanyName('');
      setJobDescription('');
      setLocation('');
      setNotes('');
      setParsedData(null);
      setError('');
    }
  };

  const fetchSuggestions = async (query: string, type: 'company' | 'title') => {
    if (query.length < 2) return;
    
    try {
      const response = await axios.post('http://localhost:8000/suggestions', {
        query,
        type
      });
      
      if (type === 'company') {
        setCompanySuggestions(response.data.suggestions);
      } else {
        setTitleSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleTitleChange = (value: string) => {
    setJobTitle(value);
    if (value.length >= 2) {
      fetchSuggestions(value, 'title');
      setShowTitleSuggestions(true);
    } else {
      setShowTitleSuggestions(false);
    }
  };

  const handleCompanyChange = (value: string) => {
    setCompanyName(value);
    if (value.length >= 2) {
      fetchSuggestions(value, 'company');
      setShowCompanySuggestions(true);
    } else {
      setShowCompanySuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string, type: 'title' | 'company') => {
    if (type === 'title') {
      setJobTitle(suggestion);
      setShowTitleSuggestions(false);
    } else {
      setCompanyName(suggestion);
      setShowCompanySuggestions(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Job Application
      </Button>

      <Modal 
        isOpen={isOpen} 
        onClose={handleClose}
        title={step === 1 ? "Add Job Application" : "Job Details"}
        size="lg"
      >
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleURLSubmit}
              className="space-y-6"
            >
              <div>
                <label htmlFor="job-url" className="block text-sm font-medium mb-2">
                  <Search className="inline h-4 w-4 mr-2" />
                  Job URL
                </label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://www.linkedin.com/jobs/view/1234567890"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isParsing}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  ✨ Paste any job URL and we'll extract the details for you
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports: LinkedIn, Indeed, Glassdoor, Google Jobs, ZipRecruiter
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-md bg-destructive/15 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isParsing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isParsing || !url.trim()} className="gap-2">
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing URL...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Parse & Continue
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleDetailsSubmit}
              className="space-y-4"
            >
              {/* URL Display */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Source URL</p>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {parsedData?.source_site && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs capitalize">
                        {parsedData.source_site}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Job Title with Suggestions */}
              <div className="relative">
                <label htmlFor="job-title" className="block text-sm font-medium mb-2">
                  Job Title *
                </label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  disabled={isLoading}
                />
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {titleSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => selectSuggestion(suggestion, 'title')}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Company Name with Suggestions */}
              <div className="relative">
                <label htmlFor="company-name" className="block text-sm font-medium mb-2">
                  Company Name *
                </label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  placeholder="e.g. Google"
                  disabled={isLoading}
                />
                {showCompanySuggestions && companySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {companySuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => selectSuggestion(suggestion, 'company')}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-2">
                  Location
                </label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Remote"
                  disabled={isLoading}
                />
              </div>

              {/* Job Description */}
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium mb-2">
                  Job Description
                </label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description or add your own notes..."
                  disabled={isLoading}
                  className="w-full h-24 px-3 py-2 text-sm border border-input bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                  Personal Notes
                </label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Applied through referral, interesting role..."
                  disabled={isLoading}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-md bg-destructive/15 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Application'
                    )}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
};