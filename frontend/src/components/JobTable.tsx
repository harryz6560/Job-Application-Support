import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ExternalLink, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { JobApplication } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';

interface JobTableProps {
  applications: JobApplication[];
  onViewHtml: (application: JobApplication) => void;
  onDeleteApplication?: (application: JobApplication) => void;
}

export const JobTable: React.FC<JobTableProps> = ({ applications, onViewHtml, onDeleteApplication }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof JobApplication>('application_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredApplications = applications.filter(app =>
    app.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.source_site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const aValue = a[sortField] as string | Date;
    const bValue = b[sortField] as string | Date;
    
    if (!aValue || !bValue) return 0;
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof JobApplication) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'applied': return 'default';
      case 'interview': return 'warning';
      case 'offer': return 'success';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getSourceSiteBadgeColor = (site: string) => {
    switch (site) {
      case 'linkedin': return 'bg-blue-500 text-white';
      case 'glassdoor': return 'bg-green-500 text-white';
      case 'indeed': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies, positions, or sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Company</span>
                    {sortField === 'company_name' && (
                      <motion.span
                        initial={{ rotate: 0 }}
                        animate={{ rotate: sortDirection === 'desc' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ↑
                      </motion.span>
                    )}
                  </div>
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort('job_title')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Position</span>
                    {sortField === 'job_title' && (
                      <motion.span
                        initial={{ rotate: 0 }}
                        animate={{ rotate: sortDirection === 'desc' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ↑
                      </motion.span>
                    )}
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Source
                </th>
                <th 
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort('application_date')}
                >
                  <div className="flex items-center space-x-2">
                    <span>Applied Date</span>
                    {sortField === 'application_date' && (
                      <motion.span
                        initial={{ rotate: 0 }}
                        animate={{ rotate: sortDirection === 'desc' ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ↑
                      </motion.span>
                    )}
                  </div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedApplications.map((application, index) => (
                <motion.tr
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4">
                    <div className="font-medium">{application.company_name}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{application.job_title}</div>
                  </td>
                  <td className="p-4">
                    <Badge 
                      className={cn(
                        "capitalize",
                        getSourceSiteBadgeColor(application.source_site)
                      )}
                    >
                      {application.source_site}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {format(new Date(application.application_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4">
                    <Badge variant={getStatusBadgeVariant(application.status)} className="capitalize">
                      {application.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewHtml(application)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                        title="View Job Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(application.job_url, '_blank')}
                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                        title="Open Job URL"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {onDeleteApplication && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteApplication(application)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          title="Delete Application"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedApplications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No applications found</p>
          </div>
        )}
      </div>
    </div>
  );
};