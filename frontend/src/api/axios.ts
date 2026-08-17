import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { sanitizeAxiosError } from './error';

interface RetryConfig extends InternalAxiosRequestConfig { _retry?:boolean }
let refreshPromise:Promise<string>|null=null;
let authFailureHandler:()=>void=()=>undefined;
let runtimeAccessToken:string|null=null;
let authFailureNotified=false;
const api=axios.create({baseURL:'/api',timeout:15000,withCredentials:true});
const refreshClient=axios.create({baseURL:'/api',timeout:15000,withCredentials:true});
export const setAuthFailureHandler=(handler:()=>void)=>{authFailureHandler=handler;};
export const setAccessToken=(token:string|null)=>{runtimeAccessToken=token;if(token){authFailureNotified=false;api.defaults.headers.common.Authorization=`Bearer ${token}`;}else delete api.defaults.headers.common.Authorization;};
export const getAccessToken=()=>runtimeAccessToken;
export const clearAuthStorage=()=>{localStorage.removeItem('token');localStorage.removeItem('refreshToken');setAccessToken(null);};

// Remove legacy persistent token values as soon as this browser bundle loads.
// PHASE 26 keeps the access token in runtime memory and PHASE 25 owns refresh
// transport in an HttpOnly cookie.
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');

api.interceptors.request.use(config=>{const token=runtimeAccessToken;if(token)config.headers.set('Authorization',`Bearer ${token}`);else config.headers.delete('Authorization');return config;});
const requestRefresh=():Promise<string>=>{
  refreshPromise??=refreshClient.post('/auth/refresh').then(({data})=>{
    const newAccessToken=String(data.data.accessToken);
    if(!newAccessToken||newAccessToken==='undefined')throw new Error('Refresh response did not include an access token');
    setAccessToken(newAccessToken);
    return newAccessToken;
  }).finally(()=>{refreshPromise=null;});
  return refreshPromise;
};
export const restoreAccessToken=()=>requestRefresh();
api.interceptors.response.use(response=>response,async(error:AxiosError)=>{
  const config=error.config as RetryConfig|undefined; const status=error.response?.status;
  const path=config?.url||''; const isAuthEndpoint=['/auth/login','/auth/register','/auth/refresh','/auth/logout'].some(value=>path.includes(value));
  if(status!==401||!config||config._retry||isAuthEndpoint)return Promise.reject(sanitizeAxiosError(error));
  config._retry=true;
  try {
    const accessToken=await requestRefresh();
    config.headers.set('Authorization',`Bearer ${accessToken}`);
    return api.request(config);
  } catch(refreshError){clearAuthStorage();if(!authFailureNotified){authFailureNotified=true;authFailureHandler();}return Promise.reject(sanitizeAxiosError(refreshError));}
});
export const productAPI={get:(url:string)=>api.get(url),post:(url:string,data?:unknown)=>api.post(url,data),put:(url:string,data?:unknown)=>api.put(url,data),delete:(url:string)=>api.delete(url)};
export default api;
