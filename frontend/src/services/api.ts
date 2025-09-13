import axios from 'axios';
import { JobApplication } from '../types';

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  async getApplications(): Promise<JobApplication[]> {
    const response = await axios.get(`${API_BASE_URL}/applications`);
    return response.data;
  },

  async addApplication(url: string): Promise<JobApplication> {
    const response = await axios.post(`${API_BASE_URL}/applications`, { url });
    return response.data;
  },

  async addManualApplication(jobData: any): Promise<JobApplication> {
    const response = await axios.post(`${API_BASE_URL}/applications/manual`, jobData);
    return response.data;
  },

  async parseUrl(url: string): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/parse-url`, { url });
    return response.data;
  },

  async getSuggestions(query: string, type: 'company' | 'title'): Promise<string[]> {
    const response = await axios.post(`${API_BASE_URL}/suggestions`, { query, type });
    return response.data.suggestions;
  },

  async getApplicationHtml(id: string): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/applications/${id}/html`);
    return response.data.html_content;
  },

  async deleteApplication(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/applications/${id}`);
  }
};