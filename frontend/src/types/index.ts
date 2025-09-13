export interface JobApplication {
  id: string;
  company_name: string;
  job_title: string;
  job_url: string;
  source_site: 'glassdoor' | 'linkedin' | 'indeed';
  application_date: string;
  job_description?: string;
  html_snapshot_path?: string;
  status: 'applied' | 'interview' | 'rejected' | 'offer';
  created_at: string;
}