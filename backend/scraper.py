import os
import uuid
import time
import random
import logging
from typing import Dict, Optional, List
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium_stealth import stealth
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from seleniumwire import webdriver as wire_webdriver

class JobScraper:
    def __init__(self):
        self.snapshots_dir = "../snapshots"
        os.makedirs(self.snapshots_dir, exist_ok=True)
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Rotate between different user agents to avoid detection
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        # Free proxy list (you can expand this or use a proxy service)
        self.proxy_list = [
            # Format: "ip:port" - these are example proxies, replace with working ones
            # You can get free proxies from:
            # - https://www.proxy-list.download/
            # - https://free-proxy-list.net/
            # - https://www.proxyscrape.com/
            # Note: Free proxies are unreliable, consider paid services for production
            # "8.210.83.33:80",
            # "47.74.152.29:8888",
            # "20.111.54.16:80",
        ]
        
        # Alternatively, you can fetch proxies from a free API
        # self._load_free_proxies()
        
        self.current_proxy_index = 0
        
    def _load_free_proxies(self):
        """Load free proxies from a public API (optional)"""
        try:
            # Example: Using a free proxy API
            # response = requests.get("https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all")
            # proxies = response.text.strip().split('\n')
            # self.proxy_list = [proxy.strip() for proxy in proxies if proxy.strip()]
            # self.logger.info(f"Loaded {len(self.proxy_list)} proxies from API")
            pass
        except Exception as e:
            self.logger.warning(f"Failed to load proxies from API: {e}")
        
    def _get_next_proxy(self) -> Optional[str]:
        """Get next proxy from the rotation list"""
        if not self.proxy_list:
            return None
        
        proxy = self.proxy_list[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxy_list)
        return proxy
        
    def _get_chrome_driver(self, use_proxy: bool = True):
        """Configure Chrome driver with proven anti-detection techniques"""
        proxy = self._get_next_proxy() if use_proxy else None
        
        # Use selenium-wire if proxy is available, otherwise regular selenium
        if proxy:
            seleniumwire_options = {
                'proxy': {
                    'http': f'http://{proxy}',
                    'https': f'http://{proxy}',
                    'no_proxy': 'localhost,127.0.0.1'
                }
            }
            
            options = wire_webdriver.ChromeOptions()
            self.logger.info(f"Using proxy: {proxy}")
        else:
            seleniumwire_options = {}
            options = webdriver.ChromeOptions()
            
        options.add_argument("--headless")
        options.add_argument("--start-maximized")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Additional anti-detection arguments
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-web-security")
        options.add_argument("--allow-running-insecure-content")
        options.add_argument("--disable-extensions")
        
        # Random user agent
        user_agent = random.choice(self.user_agents)
        options.add_argument(f"--user-agent={user_agent}")
        
        if proxy:
            driver = wire_webdriver.Chrome(
                service=ChromeService(ChromeDriverManager().install()),
                options=options,
                seleniumwire_options=seleniumwire_options
            )
        else:
            driver = webdriver.Chrome(
                service=ChromeService(ChromeDriverManager().install()), 
                options=options
            )
        
        # Apply selenium-stealth - this is the key anti-detection technique
        stealth(driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True,
        )
        
        return driver

    def _find_element_with_fallbacks(self, driver, selectors_list, method="css"):
        """Find element using multiple fallback selectors"""
        for selector in selectors_list:
            try:
                if method == "css":
                    element = driver.find_element(By.CSS_SELECTOR, selector)
                elif method == "xpath":
                    element = driver.find_element(By.XPATH, selector)
                else:
                    element = driver.find_element(By.CSS_SELECTOR, selector)
                
                text = element.text.strip()
                if text:  # Only return non-empty text
                    return text
            except (NoSuchElementException, TimeoutException):
                continue
        return None

    def _find_element_attribute_with_fallbacks(self, driver, selectors_list, attribute="href"):
        """Find element attribute using multiple fallback selectors"""
        for selector in selectors_list:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                attr_value = element.get_attribute(attribute)
                if attr_value:
                    return attr_value
            except (NoSuchElementException, TimeoutException):
                continue
        return None

    def _determine_source_site(self, url: str) -> str:
        domain = urlparse(url).netloc.lower()
        if 'glassdoor' in domain:
            return 'glassdoor'
        elif 'linkedin' in domain:
            return 'linkedin'
        elif 'indeed' in domain:
            return 'indeed'
        else:
            return 'unknown'

    def _save_html_snapshot(self, html_content: str, job_id: str) -> str:
        filename = f"{job_id}.html"
        filepath = os.path.join(self.snapshots_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return filepath

    def _try_requests_scraping(self, url: str) -> Optional[Dict[str, str]]:
        """Try scraping with requests first - faster and less likely to be blocked"""
        try:
            # Random delay between 2-10 seconds
            delay = random.uniform(2, 10)
            time.sleep(delay)
            
            # Use random user agent
            user_agent = random.choice(self.user_agents)
            
            headers = {
                "User-Agent": user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Cache-Control": "max-age=0",
            }
            
            # Setup proxy if available
            proxies = None
            proxy = self._get_next_proxy()
            if proxy:
                proxies = {
                    'http': f'http://{proxy}',
                    'https': f'http://{proxy}'
                }
                self.logger.info(f"Using proxy for requests: {proxy}")
            
            self.logger.info(f"Attempting requests-based scraping for: {url}")
            response = requests.get(
                url, 
                headers=headers, 
                timeout=30, 
                allow_redirects=True,
                proxies=proxies
            )
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Generic extraction using common patterns
                job_title = None
                company_name = None
                job_description = None
                
                # Try to find job title
                title_selectors = [
                    'h1[data-testid*="title"]',
                    'h1[class*="job-title"]',
                    'h1[class*="title"]',
                    'h1',
                    '[data-testid*="job-title"]',
                    '[class*="job-title"]'
                ]
                
                for selector in title_selectors:
                    element = soup.select_one(selector)
                    if element and element.get_text(strip=True):
                        job_title = element.get_text(strip=True)
                        break
                
                # Try to find company name
                company_selectors = [
                    '[data-testid*="company"]',
                    '[class*="company-name"]',
                    '[class*="employer"]',
                    'a[href*="company"]',
                    'span[class*="company"]'
                ]
                
                for selector in company_selectors:
                    element = soup.select_one(selector)
                    if element and element.get_text(strip=True):
                        company_name = element.get_text(strip=True)
                        break
                
                # Try to find description
                desc_selectors = [
                    '[data-testid*="description"]',
                    '[class*="job-description"]',
                    '[class*="description"]',
                    '[id*="description"]'
                ]
                
                for selector in desc_selectors:
                    element = soup.select_one(selector)
                    if element and element.get_text(strip=True):
                        job_description = element.get_text(strip=True)[:2000]  # Limit length
                        break
                
                if job_title or company_name:  # If we got something useful
                    self.logger.info(f"Successfully extracted data with requests: {job_title} at {company_name}")
                    return {
                        "company_name": company_name or "Unknown Company",
                        "job_title": job_title or "Unknown Position",
                        "job_description": job_description or "No description available",
                        "html_content": response.text,
                        "extraction_method": "requests"
                    }
            else:
                self.logger.warning(f"Requests scraping failed with status {response.status_code}")
                
        except Exception as e:
            self.logger.warning(f"Requests scraping failed: {str(e)}")
            
        return None

    async def _scrape_linkedin(self, driver, url: str) -> Dict[str, str]:
        self.logger.info(f"Scraping LinkedIn URL: {url}")
        driver.get(url)
        time.sleep(5)
        
        # Multiple selectors for company name
        company_selectors = [
            ".job-details-jobs-unified-top-card__company-name a",
            ".job-details-jobs-unified-top-card__company-name",
            "[data-testid='job-details-company-name']",
            ".jobs-unified-top-card__company-name a",
            ".jobs-unified-top-card__company-name",
            ".job-details-company a",
            ".job-details-company",
            "a[data-control-name='job_details_topcard_company_url']"
        ]
        company_name = self._find_element_with_fallbacks(driver, company_selectors) or "Unknown Company"
        
        # Multiple selectors for job title  
        title_selectors = [
            ".job-details-jobs-unified-top-card__job-title a",
            ".job-details-jobs-unified-top-card__job-title", 
            ".jobs-unified-top-card__job-title a",
            ".jobs-unified-top-card__job-title",
            "h1[data-testid='job-details-job-title']",
            "h1.job-details-job-title",
            "h1.jobs-unified-top-card__job-title",
            "h1"
        ]
        job_title = self._find_element_with_fallbacks(driver, title_selectors) or "Unknown Position"
        
        # Multiple selectors for job description
        description_selectors = [
            ".job-details-jobs-unified-top-card__job-description",
            ".jobs-description-content__text",
            ".jobs-box__html-content",
            ".job-details-job-description",
            "[data-testid='job-details-job-description']",
            ".jobs-description__content",
            ".job-view-layout .jobs-box__html-content"
        ]
        job_description = self._find_element_with_fallbacks(driver, description_selectors) or "No description available"
        
        self.logger.info(f"Successfully scraped LinkedIn job: {job_title} at {company_name}")
        
        return {
            "company_name": company_name,
            "job_title": job_title,
            "job_description": job_description,
            "source_site": "linkedin"
        }

    async def _scrape_glassdoor(self, driver, url: str) -> Dict[str, str]:
        self.logger.info(f"Scraping Glassdoor URL: {url}")
        driver.get(url)
        time.sleep(5)
        
        # Multiple selectors for company name
        company_selectors = [
            "[data-test='employer-name']",
            ".employer-name",
            "[data-testid='employer-name']",
            ".jobview-header-employer-name",
            ".job-details-employer-name",
            "span[data-test='employer-name']",
            ".employer-info span"
        ]
        company_name = self._find_element_with_fallbacks(driver, company_selectors) or "Unknown Company"
        
        # Multiple selectors for job title
        title_selectors = [
            "[data-test='job-title']",
            ".job-title",
            "[data-testid='job-title']", 
            ".jobview-header-job-title",
            ".job-details-job-title",
            "h1[data-test='job-title']",
            "h1.job-title"
        ]
        job_title = self._find_element_with_fallbacks(driver, title_selectors) or "Unknown Position"
        
        # Multiple selectors for job description
        description_selectors = [
            "[data-test='job-description-content']",
            ".job-description-content",
            "[data-testid='job-description-content']",
            ".jobview-job-description-content", 
            ".job-details-description-content",
            ".jobDescriptionContent",
            "#job-description-content"
        ]
        job_description = self._find_element_with_fallbacks(driver, description_selectors) or "No description available"
        
        self.logger.info(f"Successfully scraped Glassdoor job: {job_title} at {company_name}")
        
        return {
            "company_name": company_name,
            "job_title": job_title,
            "job_description": job_description,
            "source_site": "glassdoor"
        }

    async def _scrape_indeed(self, driver, url: str) -> Dict[str, str]:
        self.logger.info(f"Scraping Indeed URL: {url}")
        driver.get(url)
        time.sleep(5)  # Longer wait for anti-detection
        
        # Multiple selectors for company name (based on working scraper)
        company_selectors = [
            "[data-testid='inlineHeader-companyName']",
            "[data-testid='company-name']",
            "span[data-testid='company-name']",
            ".icl-u-lg-mr--sm",
            "span[class*='company']",
            "[data-testid='jobsearch-CompanyInfoContainer'] span",
            ".jobsearch-CompanyInfoWithoutHeaderImage span"
        ]
        company_name = self._find_element_with_fallbacks(driver, company_selectors) or "Unknown Company"
        
        # Multiple selectors for job title
        title_selectors = [
            "[data-testid='jobsearch-JobInfoHeader-title']",
            "h1[data-testid='jobsearch-JobInfoHeader-title']",
            "h1.jobsearch-JobInfoHeader-title",
            "h1",
            ".jobsearch-JobInfoHeader-title",
            "[data-testid='job-title']"
        ]
        job_title = self._find_element_with_fallbacks(driver, title_selectors) or "Unknown Position"
        
        # Multiple selectors for job description
        description_selectors = [
            "#jobDescriptionText",
            "[data-testid='jobsearch-JobComponent-description']",
            ".jobsearch-JobComponent-description",
            "[data-testid='job-description']",
            ".jobDescriptionContent",
            "#job-description"
        ]
        job_description = self._find_element_with_fallbacks(driver, description_selectors) or "No description available"
        
        self.logger.info(f"Successfully scraped Indeed job: {job_title} at {company_name}")
        
        return {
            "company_name": company_name,
            "job_title": job_title,
            "job_description": job_description,
            "source_site": "indeed"
        }

    async def scrape_job(self, url: str) -> Dict[str, str]:
        source_site = self._determine_source_site(url)
        job_id = str(uuid.uuid4())
        
        self.logger.info(f"Starting to scrape job from {source_site}: {url}")
        
        # Step 1: Try requests-based scraping first (faster, less detectable)
        requests_result = self._try_requests_scraping(url)
        if requests_result:
            # Save HTML snapshot from requests result
            try:
                html_path = self._save_html_snapshot(requests_result["html_content"], job_id)
                requests_result["html_snapshot_path"] = html_path
                requests_result["source_site"] = source_site
                del requests_result["html_content"]  # Remove from result to keep it clean
                self.logger.info(f"Successfully scraped with requests: {requests_result['job_title']}")
                return requests_result
            except Exception as e:
                self.logger.error(f"Failed to save HTML from requests scraping: {e}")
        
        # Step 2: Fall back to Selenium if requests failed
        self.logger.info("Requests scraping failed, falling back to Selenium...")
        driver = None
        try:
            driver = self._get_chrome_driver()
            
            # Add random delay to avoid detection patterns
            delay = random.uniform(3, 8)  # 3-8 seconds delay
            time.sleep(delay)
            
            if source_site == 'linkedin':
                job_data = await self._scrape_linkedin(driver, url)
            elif source_site == 'glassdoor':
                job_data = await self._scrape_glassdoor(driver, url)
            elif source_site == 'indeed':
                job_data = await self._scrape_indeed(driver, url)
            else:
                # Generic scraping fallback
                self.logger.warning(f"Unknown source site: {source_site}, attempting generic scraping")
                driver.get(url)
                time.sleep(5)
                
                # Try to extract basic info generically
                generic_title = self._find_element_with_fallbacks(driver, ["h1", "title", ".job-title", ".title"])
                
                job_data = {
                    "company_name": "Unknown Company",
                    "job_title": generic_title or "Unknown Position", 
                    "job_description": "No description available",
                    "source_site": source_site
                }
            
            # Save HTML snapshot
            try:
                html_content = driver.page_source
                html_path = self._save_html_snapshot(html_content, job_id)
                job_data["html_snapshot_path"] = html_path
                self.logger.info(f"HTML snapshot saved: {html_path}")
            except Exception as e:
                self.logger.error(f"Failed to save HTML snapshot: {str(e)}")
                job_data["html_snapshot_path"] = None
            
            self.logger.info(f"Successfully scraped job: {job_data.get('job_title', 'Unknown')} at {job_data.get('company_name', 'Unknown')}")
            return job_data
            
        except Exception as e:
            self.logger.error(f"Error scraping job from {url}: {str(e)}")
            # Return partial data even on error
            return {
                "company_name": "Unknown Company",
                "job_title": "Unknown Position", 
                "job_description": f"Error occurred while scraping: {str(e)}",
                "source_site": source_site,
                "html_snapshot_path": None
            }
            
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass