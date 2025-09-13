import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

interface AddJobFormProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const AddJobForm: React.FC<AddJobFormProps> = ({ onSubmit, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      await onSubmit(url);
      setUrl('');
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add job application');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setUrl('');
      setError('');
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
        title="Add Job Application"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="job-url" className="block text-sm font-medium mb-2">
              Job URL
            </label>
            <Input
              id="job-url"
              type="url"
              placeholder="https://www.linkedin.com/jobs/view/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Paste the URL from LinkedIn, Glassdoor, or Indeed
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

          <div className="flex justify-end space-x-2 pt-4">
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
                  Processing...
                </>
              ) : (
                'Add Application'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};