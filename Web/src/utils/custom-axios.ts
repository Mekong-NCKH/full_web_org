import axios from 'axios';

import storage from '@/helpers/storage';

const instance = axios.create({
  baseURL: 'http://locahost:3001', // port BE, will be changed later when BE is ready
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token: string | null = storage.getItem('token');
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error('Error in axios');
    Promise.reject(error);
  },
);

export default instance;
