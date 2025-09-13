# Job Application Tracker

A modern web application to automatically track and manage job applications from LinkedIn, Glassdoor, and Indeed. Simply paste a job URL and the app will extract company name, job title, description, and save a snapshot of the original posting.

## Features

- 🚀 **Automatic Data Extraction** - Scrapes job details from major job sites
- 📱 **Modern UI** - Clean, responsive interface with dark/light mode
- 🔍 **Search & Filter** - Find applications quickly
- 📄 **HTML Snapshots** - View original job postings offline  
- 🎯 **Status Tracking** - Track application status (Applied, Interview, Offer, Rejected)
- 💾 **Local Database** - All data stored locally in SQLite

## Tech Stack

- **Backend**: FastAPI + Python
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: SQLite with SQLAlchemy
- **Scraping**: Selenium + BeautifulSoup
- **UI**: Framer Motion animations + Modern components

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- Chrome browser (for web scraping)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the FastAPI server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Add Job Application**: Click "Add Job Application" and paste a URL from:
   - LinkedIn Jobs
   - Glassdoor
   - Indeed

2. **View Applications**: Browse your applications in the table view with:
   - Company name and position
   - Application date
   - Source website
   - Current status

3. **View Original Posting**: Click the eye icon to view the saved HTML snapshot

4. **Visit Original**: Click the external link icon to open the original job posting

## Supported Job Sites

- **LinkedIn**: `linkedin.com/jobs/view/...`
- **Glassdoor**: `glassdoor.com/job-listing/...` 
- **Indeed**: `indeed.com/viewjob?jk=...`

## Project Structure

```
job-application-support/
├── backend/           # FastAPI backend
│   ├── main.py       # API endpoints
│   ├── models.py     # Database models
│   ├── scraper.py    # Web scraping service
│   └── database.py   # Database configuration
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # API services  
│   │   └── types/       # TypeScript types
└── snapshots/        # Saved HTML files
```
