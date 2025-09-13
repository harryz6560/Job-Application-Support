import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Moon, Sun } from 'lucide-react';
import { JobApplication } from './types';
import { JobTable } from './components/JobTable';
import { EnhancedJobForm } from './components/EnhancedJobForm';
import { JobViewer } from './components/JobViewer';
import { Button } from './components/ui/Button';
import { api } from './services/api';

function App() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isHtmlViewerOpen, setIsHtmlViewerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<JobApplication | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddJob = async (jobData: any) => {
    setIsAddingJob(true);
    try {
      let newApplication;
      if (jobData.url) {
        // This is a URL-based submission (from scraping flow)
        newApplication = jobData; // Already processed by EnhancedJobForm
      } else {
        // This is manual entry data
        newApplication = await api.addManualApplication(jobData);
      }
      setApplications(prev => [newApplication, ...prev]);
    } catch (error) {
      throw error;
    } finally {
      setIsAddingJob(false);
    }
  };

  const handleViewHtml = (application: JobApplication) => {
    setSelectedApplication(application);
    setIsHtmlViewerOpen(true);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleDeleteRequest = (application: JobApplication) => {
    setApplicationToDelete(application);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!applicationToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteApplication(applicationToDelete.id);
      setApplications(prev => prev.filter(app => app.id !== applicationToDelete.id));
      setDeleteConfirmOpen(false);
      setApplicationToDelete(null);
    } catch (error) {
      console.error('Failed to delete application:', error);
      // You could add a toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setApplicationToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Job Application Tracker</h1>
              <p className="text-muted-foreground">Track and manage your job applications</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-9 w-9 p-0"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <EnhancedJobForm onSubmit={handleAddJob} isLoading={isAddingJob} />
          </div>
        </motion.header>

        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <JobTable 
              applications={applications} 
              onViewHtml={handleViewHtml}
              onDeleteApplication={handleDeleteRequest}
            />
          )}
        </motion.main>

        {/* Job Viewer */}
        <JobViewer
          application={selectedApplication}
          isOpen={isHtmlViewerOpen}
          onClose={() => {
            setIsHtmlViewerOpen(false);
            setSelectedApplication(null);
          }}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && applicationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDeleteCancel} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-background rounded-lg border shadow-xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-destructive">Delete Application</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Are you sure you want to delete this job application?
                </p>
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="font-medium">{applicationToDelete.job_title}</p>
                  <p className="text-sm text-muted-foreground">{applicationToDelete.company_name}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
