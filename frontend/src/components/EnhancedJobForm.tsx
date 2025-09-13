import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { api } from '../services/api';

interface EnhancedJobFormProps {
  onSubmit: (jobData: any) => void;
  isLoading: boolean;
}

export const EnhancedJobForm: React.FC<EnhancedJobFormProps> = ({ onSubmit, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Simple form state
  const [formData, setFormData] = useState({
    job_url: '',
    company_name: '',
    job_title: '',
    job_description: ''
  });

  // Function to detect source site from URL
  const detectSourceSite = (url: string): string => {
    if (!url) return 'linkedin'; // default
    
    const urlLower = url.toLowerCase();
    if (urlLower.includes('linkedin.com')) return 'linkedin';
    if (urlLower.includes('indeed.com') || urlLower.includes('indeed.ca')) return 'indeed';
    if (urlLower.includes('glassdoor.com') || urlLower.includes('glassdoor.ca')) return 'glassdoor';
    
    return 'linkedin'; // default fallback
  };

  const resetForm = () => {
    setFormData({
      job_url: '',
      company_name: '',
      job_title: '',
      job_description: ''
    });
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const jobData = {
        ...formData,
        source_site: detectSourceSite(formData.job_url)
      };
      
      console.log('Submitting job data:', jobData);
      
      const savedJob = await api.addManualApplication(jobData);
      
      console.log('Job saved successfully:', savedJob);
      
      onSubmit(savedJob);
      resetForm();
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  return (
    <>
      {/* Add Job Button */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
        disabled={isLoading}
      >
        <Plus className="h-4 w-4" />
        Add Job
      </Button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background rounded-lg border shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Add Job Application</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <Label htmlFor="job_url">Job URL *</Label>
                  <Input
                    id="job_url"
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/123456789"
                    value={formData.job_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_url: e.target.value }))}
                    disabled={isLoading}
                    required
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Website will be auto-detected from URL (LinkedIn, Indeed, Glassdoor)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="e.g., KPMG Canada"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">Job Position *</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="e.g., Software Engineer"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="job_description">Job Description</Label>
                  <textarea
                    id="job_description"
                    value={formData.job_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                    placeholder="Copy and paste the job description here..."
                    rows={8}
                    disabled={isLoading}
                    className="w-full p-3 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.job_url || !formData.company_name || !formData.job_title || isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Job Application
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};