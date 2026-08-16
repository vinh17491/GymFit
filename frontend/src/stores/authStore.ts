import { create } from 'zustand';
import api,{clearAuthStorage,setAuthFailureHandler} from '../api/axios';
import { User } from '../types';
import { useProductsStore } from './productsStore';

interface RegisterInput { email:string;password:string;name:string;phone?:string;referral_code?:string }
interface AuthState { user:User|null;isAuthenticated:boolean;initialized:boolean;login:(email:string,password:string)=>Promise<User>;register:(input:RegisterInput)=>Promise<User>;logout:()=>Promise<void>;initUser:()=>Promise<void>;setUser:(user:User)=>void;clearSession:()=>void }
const persist=(data:{user:User;accessToken:string;refreshToken:string},set:(value:Partial<AuthState>)=>void)=>{localStorage.setItem('token',data.accessToken);localStorage.setItem('refreshToken',data.refreshToken);set({user:data.user,isAuthenticated:true,initialized:true});};
export const useAuthStore=create<AuthState>((set)=>({
  user:null,isAuthenticated:false,initialized:false,
  clearSession:()=>{clearAuthStorage();set({user:null,isAuthenticated:false,initialized:true});void useProductsStore.getState().initializeForUser(null);},
  login:async(email,password)=>{clearAuthStorage();set({user:null,isAuthenticated:false});const {data}=await api.post('/auth/login',{email,password});persist(data.data,set);await useProductsStore.getState().initializeForUser(data.data.user);return data.data.user;},
  register:async(input)=>{clearAuthStorage();set({user:null,isAuthenticated:false});const {data}=await api.post('/auth/register',input);persist(data.data,set);await useProductsStore.getState().initializeForUser(data.data.user);return data.data.user;},
  logout:async()=>{try{if(localStorage.getItem('token'))await api.post('/auth/logout');}finally{clearAuthStorage();set({user:null,isAuthenticated:false,initialized:true});await useProductsStore.getState().initializeForUser(null);}},
  setUser:(user)=>set({user}),
  initUser:async()=>{if(!localStorage.getItem('token')){clearAuthStorage();set({user:null,isAuthenticated:false,initialized:true});await useProductsStore.getState().initializeForUser(null);return;}try{const {data}=await api.get('/auth/me');set({user:data.data,isAuthenticated:true,initialized:true});await useProductsStore.getState().initializeForUser(data.data);}catch{clearAuthStorage();set({user:null,isAuthenticated:false,initialized:true});await useProductsStore.getState().initializeForUser(null);}},
}));
setAuthFailureHandler(()=>useAuthStore.getState().clearSession());
