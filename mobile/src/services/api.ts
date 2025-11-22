import axios from 'axios';
import {API_URL} from '../config/api';
import {storage} from './storage';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async config => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  async register(email: string, password: string, name: string) {
    const response = await api.post('/auth/register', {email, password, name});
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post('/auth/login', {email, password});
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Family API
export const familyApi = {
  async createFamily(name: string) {
    const response = await api.post('/family/create', {name});
    return response.data;
  },

  async joinFamily(inviteCode: string) {
    const response = await api.post('/family/join', {inviteCode});
    return response.data;
  },

  async listFamilies() {
    const response = await api.get('/family/list');
    return response.data;
  },

  async getMembers(familyId: number) {
    const response = await api.get(`/family/${familyId}/members`);
    return response.data;
  },

  async updateVisibility(familyId: number, isVisible: boolean) {
    const response = await api.patch(`/family/${familyId}/visibility`, {
      isVisible,
    });
    return response.data;
  },
};

export default api;
