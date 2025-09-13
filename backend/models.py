from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum
import uuid

from database import Base

class SourceSite(str, Enum):
    GLASSDOOR = "glassdoor"
    LINKEDIN = "linkedin"
    INDEED = "indeed"

class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    OFFER = "offer"

class JobApplicationDB(Base):
    __tablename__ = "job_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    job_url = Column(String, nullable=False)
    source_site = Column(SQLEnum(SourceSite), nullable=False)
    application_date = Column(DateTime, default=datetime.utcnow)
    job_description = Column(Text)
    html_snapshot_path = Column(String)
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    created_at = Column(DateTime, default=datetime.utcnow)

class JobApplication(BaseModel):
    id: str
    company_name: str
    job_title: str
    job_url: str
    source_site: SourceSite
    application_date: datetime
    job_description: Optional[str] = None
    html_snapshot_path: Optional[str] = None
    status: ApplicationStatus
    created_at: datetime

    class Config:
        from_attributes = True