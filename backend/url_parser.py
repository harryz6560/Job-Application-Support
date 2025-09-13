import re
import requests
from urllib.parse import urlparse, parse_qs
from typing import Dict, Optional, List
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

class SmartJobURLParser:
    """Smart URL parser that extracts job information from URLs without heavy scraping"""
    
    def __init__(self):
        self.company_patterns = {
            'linkedin.com': self._parse_linkedin_url,
            'indeed.com': self._parse_indeed_url,
            'glassdoor.com': self._parse_glassdoor_url,
            'jobs.google.com': self._parse_google_jobs_url,
            'ziprecruiter.com': self._parse_ziprecruiter_url,
        }
        
        # Common job titles for suggestions
        self.common_job_titles = [
            'Software Engineer', 'Data Scientist', 'Product Manager', 'Designer',
            'Marketing Manager', 'Sales Representative', 'Project Manager',
            'Business Analyst', 'DevOps Engineer', 'Frontend Developer',
            'Backend Developer', 'Full Stack Developer', 'UX Designer',
            'Data Analyst', 'Technical Writer', 'QA Engineer', 'Consultant'
        ]
    
    def parse_job_url(self, url: str) -> Dict[str, Optional[str]]:
        """Extract job information from URL"""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # Remove www. prefix
            domain = re.sub(r'^www\.', '', domain)
            
            result = {
                'job_url': url,
                'source_site': self._determine_source_site(domain),
                'job_id': None,
                'company_name': None,
                'job_title': None,
                'location': None,
                'suggested_titles': self.common_job_titles[:10],  # Top 10 suggestions
                'parsed_data': {}
            }
            
            # Use specific parser if available
            for site_pattern, parser_func in self.company_patterns.items():
                if site_pattern in domain:
                    parsed_data = parser_func(url, parsed_url)
                    result.update(parsed_data)
                    break
            
            # Try to get basic page metadata if no specific parser
            if not result.get('job_title'):
                metadata = self._get_page_metadata(url)
                result.update(metadata)
                
            return result
            
        except Exception as e:
            logger.error(f"Error parsing URL {url}: {str(e)}")
            return {
                'job_url': url,
                'source_site': 'unknown',
                'job_id': None,
                'company_name': None,
                'job_title': None,
                'location': None,
                'suggested_titles': self.common_job_titles[:10],
                'error': str(e)
            }
    
    def _determine_source_site(self, domain: str) -> str:
        """Determine source site from domain"""
        if 'linkedin' in domain:
            return 'linkedin'
        elif 'indeed' in domain:
            return 'indeed'
        elif 'glassdoor' in domain:
            return 'glassdoor'
        elif 'google' in domain:
            return 'google_jobs'
        elif 'ziprecruiter' in domain:
            return 'ziprecruiter'
        else:
            return 'other'
    
    def _parse_linkedin_url(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Parse LinkedIn job URL"""
        # LinkedIn job URLs: https://www.linkedin.com/jobs/view/1234567890
        job_id_match = re.search(r'/jobs/view/(\d+)', url)
        job_id = job_id_match.group(1) if job_id_match else None
        
        # Try to extract company from URL if present
        company_match = re.search(r'linkedin\.com/company/([^/?]+)', url)
        company_name = company_match.group(1).replace('-', ' ').title() if company_match else None
        
        return {
            'job_id': job_id,
            'company_name': company_name,
            'parsed_data': {'linkedin_job_id': job_id}
        }
    
    def _parse_indeed_url(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Parse Indeed job URL"""
        query_params = parse_qs(parsed_url.query)
        
        # Indeed job URLs can be:
        # 1. https://www.indeed.com/viewjob?jk=abc123def456
        # 2. https://ca.indeed.com/jobs?...&vjk=jobkey (mobile/search with specific job)
        job_id = query_params.get('jk', [None])[0] or query_params.get('vjk', [None])[0]
        
        # Check if this is a search results URL without a specific job
        if not job_id and 'q=' in parsed_url.query:
            # This is a search results URL, not a specific job URL
            raise ValueError(
                "This appears to be a search results URL without a specific job selected. "
                "Please click on a specific job posting and copy that URL instead. "
                "Look for URLs that contain 'viewjob' or a 'vjk' parameter."
            )
        
        # Extract location from URL if present
        location = query_params.get('l', [None])[0]
        
        return {
            'job_id': job_id,
            'location': location,
            'parsed_data': {'indeed_job_key': job_id}
        }
    
    def _parse_glassdoor_url(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Parse Glassdoor job URL"""
        # Glassdoor URLs: https://www.glassdoor.com/job-listing/title-company-location-JV_ID123456.htm
        job_id_match = re.search(r'JV_ID(\d+)', url)
        job_id = job_id_match.group(1) if job_id_match else None
        
        # Try to extract company and title from URL path
        path_parts = parsed_url.path.split('/')
        if len(path_parts) > 2:
            job_listing_part = path_parts[-1].replace('.htm', '').replace('-', ' ')
            parts = job_listing_part.split(' ')
            if len(parts) >= 3:
                # Rough extraction - first part might be title, second company
                potential_title = ' '.join(parts[:2]).title()
                potential_company = ' '.join(parts[2:4]).title()
                return {
                    'job_id': job_id,
                    'job_title': potential_title,
                    'company_name': potential_company,
                    'parsed_data': {'glassdoor_job_id': job_id}
                }
        
        return {
            'job_id': job_id,
            'parsed_data': {'glassdoor_job_id': job_id}
        }
    
    def _parse_google_jobs_url(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Parse Google Jobs URL"""
        # Google Jobs URLs often have job info in query params
        query_params = parse_qs(parsed_url.query)
        
        # Extract various possible parameters
        location = query_params.get('l', [None])[0] or query_params.get('location', [None])[0]
        query = query_params.get('q', [None])[0]
        
        return {
            'job_title': query,
            'location': location,
            'parsed_data': {'google_jobs_query': query}
        }
    
    def _parse_ziprecruiter_url(self, url: str, parsed_url) -> Dict[str, Optional[str]]:
        """Parse ZipRecruiter URL"""
        # ZipRecruiter URLs: https://www.ziprecruiter.com/jobs/company-name/job-id
        path_parts = parsed_url.path.strip('/').split('/')
        
        if 'jobs' in path_parts:
            jobs_index = path_parts.index('jobs')
            if len(path_parts) > jobs_index + 1:
                company_slug = path_parts[jobs_index + 1].replace('-', ' ').title()
                return {'company_name': company_slug}
        
        return {}
    
    def _get_page_metadata(self, url: str) -> Dict[str, Optional[str]]:
        """Get basic page metadata using simple HTTP request"""
        try:
            # Simple request with timeout
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title = soup.find('title')
            page_title = title.get_text(strip=True) if title else None
            
            # Clean up title (remove common job site suffixes)
            if page_title:
                page_title = re.sub(r'\s*[-|]\s*(Indeed\.com|LinkedIn|Glassdoor|Jobs).*$', '', page_title, flags=re.IGNORECASE)
                page_title = page_title.strip()
            
            # Extract meta description
            description_meta = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
            description = description_meta.get('content', '').strip() if description_meta else None
            
            # Try to extract company from title patterns
            company_name = None
            if page_title:
                # Common patterns: "Job Title at Company Name" or "Job Title - Company Name"
                company_match = re.search(r'\s(?:at|@|-)\s([^-|]+)$', page_title)
                if company_match:
                    company_name = company_match.group(1).strip()
                    page_title = re.sub(r'\s(?:at|@|-)\s[^-|]+$', '', page_title).strip()
            
            return {
                'job_title': page_title,
                'company_name': company_name,
                'description_preview': description[:200] + '...' if description and len(description) > 200 else description,
                'parsed_data': {'page_title': page_title, 'meta_description': description}
            }
            
        except Exception as e:
            logger.warning(f"Could not fetch metadata for {url}: {str(e)}")
            return {}
    
    def get_company_suggestions(self, query: str) -> List[str]:
        """Get company name suggestions based on query"""
        # This could be enhanced with a company database
        common_companies = [
            'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Netflix',
            'Tesla', 'Uber', 'Airbnb', 'Spotify', 'Adobe', 'Salesforce',
            'IBM', 'Oracle', 'Intel', 'NVIDIA', 'Twitter', 'LinkedIn'
        ]
        
        if not query:
            return common_companies[:10]
        
        # Simple fuzzy matching
        query_lower = query.lower()
        matches = [comp for comp in common_companies if query_lower in comp.lower()]
        return matches[:10]
    
    def get_title_suggestions(self, query: str) -> List[str]:
        """Get job title suggestions based on query"""
        if not query:
            return self.common_job_titles[:10]
        
        query_lower = query.lower()
        matches = [title for title in self.common_job_titles if query_lower in title.lower()]
        return matches[:10]