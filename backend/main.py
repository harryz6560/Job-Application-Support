from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import List, Optional
import uvicorn
import os

from database import SessionLocal, engine, Base
from models import JobApplication, JobApplicationDB
from scraper import JobScraper
from url_parser import SmartJobURLParser

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Application Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class JobURLRequest(BaseModel):
    url: HttpUrl

class ParseURLRequest(BaseModel):
    url: HttpUrl

class ManualJobRequest(BaseModel):
    job_url: str
    company_name: str
    job_title: str
    job_description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "applied"
    notes: Optional[str] = None

class SuggestionRequest(BaseModel):
    query: str
    type: str  # "company" or "title"

@app.get("/")
def read_root():
    return {"message": "Job Application Tracker API"}

@app.post("/parse-url")
async def parse_job_url(request: ParseURLRequest):
    """Parse job URL to extract metadata and provide suggestions"""
    try:
        parser = SmartJobURLParser()
        parsed_data = parser.parse_job_url(str(request.url))
        return {
            "success": True,
            "data": parsed_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "job_url": str(request.url),
                "source_site": "unknown",
                "suggested_titles": parser.common_job_titles[:10] if 'parser' in locals() else []
            }
        }

@app.post("/suggestions")
def get_suggestions(request: SuggestionRequest):
    """Get auto-complete suggestions for companies or job titles"""
    parser = SmartJobURLParser()
    
    if request.type == "company":
        suggestions = parser.get_company_suggestions(request.query)
    elif request.type == "title":
        suggestions = parser.get_title_suggestions(request.query)
    else:
        suggestions = []
    
    return {"suggestions": suggestions}

@app.post("/applications/manual", response_model=JobApplication)
def add_manual_application(job_request: ManualJobRequest, db: Session = Depends(get_db)):
    """Add job application with manual entry"""
    try:
        # Create job application from manual data
        db_job = JobApplicationDB(
            company_name=job_request.company_name,
            job_title=job_request.job_title,
            job_url=job_request.job_url,
            source_site=SmartJobURLParser()._determine_source_site(job_request.job_url),
            application_date=datetime.now(),
            job_description=job_request.job_description or "No description provided",
            html_snapshot_path=None,  # No HTML for manual entry
            status=job_request.status or "applied"
        )
        
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        return JobApplication.model_validate(db_job)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error adding manual job application: {str(e)}")

@app.post("/applications", response_model=JobApplication)
async def add_application(job_request: JobURLRequest, db: Session = Depends(get_db)):
    """Primary scraping endpoint - tries web scraping first, falls back to manual entry"""
    try:
        scraper = JobScraper()
        print(f"Attempting to scrape job from URL: {job_request.url}")
        job_data = await scraper.scrape_job(str(job_request.url))
        
        # Check if scraping was successful (got meaningful data)
        scraped_successfully = (
            job_data.get("company_name") not in ["Unknown Company", ""] and
            job_data.get("job_title") not in ["Unknown Position", ""] and
            "Error occurred while scraping" not in job_data.get("job_description", "")
        )
        
        if scraped_successfully or job_data.get("extraction_method") == "requests":
            # Check if this URL already exists to prevent duplicates
            existing_application = db.query(JobApplicationDB).filter(JobApplicationDB.job_url == str(job_request.url)).first()
            if existing_application:
                print(f"Job application already exists for URL: {job_request.url}")
                return JobApplication.model_validate(existing_application)
                
            # Scraping succeeded - save to database
            db_job = JobApplicationDB(
                company_name=job_data["company_name"],
                job_title=job_data["job_title"],
                job_url=str(job_request.url),
                source_site=job_data["source_site"],
                application_date=datetime.now(),
                job_description=job_data.get("job_description", "No description available"),
                html_snapshot_path=job_data.get("html_snapshot_path"),
                status="applied"
            )
            
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            
            return JobApplication.model_validate(db_job)
        else:
            # Scraping failed but didn't crash - return error to trigger manual entry
            raise HTTPException(status_code=422, detail={
                "message": "Could not extract complete job information from URL. Please enter details manually.",
                "scraped_data": job_data,
                "fallback_to_manual": True,
                "url": str(job_request.url)
            })
            
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        # Unexpected error - also trigger manual entry fallback
        print(f"Scraping error for {job_request.url}: {str(e)}")
        raise HTTPException(status_code=422, detail={
            "message": f"Error occurred while scraping: {str(e)}. Please enter details manually.",
            "fallback_to_manual": True,
            "url": str(job_request.url)
        })

@app.get("/applications", response_model=List[JobApplication])
def get_applications(db: Session = Depends(get_db)):
    applications = db.query(JobApplicationDB).order_by(JobApplicationDB.application_date.desc()).all()
    return [JobApplication.model_validate(app) for app in applications]

@app.get("/applications/{app_id}", response_model=JobApplication)
def get_application(app_id: str, db: Session = Depends(get_db)):
    application = db.query(JobApplicationDB).filter(JobApplicationDB.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return JobApplication.model_validate(application)

@app.get("/applications/{app_id}/html")
def get_application_html(app_id: str, db: Session = Depends(get_db)):
    application = db.query(JobApplicationDB).filter(JobApplicationDB.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if HTML snapshot path exists
    if not application.html_snapshot_path:
        raise HTTPException(status_code=404, detail="No HTML snapshot available for this application")
    
    try:
        # Check if file exists
        if not os.path.exists(application.html_snapshot_path):
            raise HTTPException(status_code=404, detail="HTML snapshot file not found")
            
        with open(application.html_snapshot_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        if not html_content.strip():
            raise HTTPException(status_code=404, detail="HTML snapshot is empty")
            
        return {"html_content": html_content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="HTML snapshot file not found")
    except UnicodeDecodeError:
        raise HTTPException(status_code=500, detail="HTML snapshot file is corrupted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading HTML snapshot: {str(e)}")

@app.delete("/applications/{app_id}")
def delete_application(app_id: str, db: Session = Depends(get_db)):
    application = db.query(JobApplicationDB).filter(JobApplicationDB.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Delete HTML snapshot file if it exists
    if application.html_snapshot_path:
        try:
            import os
            if os.path.exists(application.html_snapshot_path):
                os.remove(application.html_snapshot_path)
        except Exception as e:
            print(f"Warning: Could not delete HTML file: {e}")
    
    db.delete(application)
    db.commit()
    return {"message": "Application deleted successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)