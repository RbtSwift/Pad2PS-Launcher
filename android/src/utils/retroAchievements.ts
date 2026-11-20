import { Capacitor, registerPlugin } from '@capacitor/core';
interface RetroCredentialsPlugin { save(options:{value:string}):Promise<{ok:boolean}>; load():Promise<{value?:string}>; clear():Promise<{ok:boolean}> }
export const RetroCredentials = registerPlugin<RetroCredentialsPlugin>('RetroCredentials');
export interface RetroProfile { User:string; UserPic:string; TotalPoints:number; TotalSoftcorePoints:number; TotalTruePoints:number; Rank?:number; }
export interface RetroAchievement { ID:number; Title:string; Description:string; Points:number; TrueRatio:number; DateEarnedHardcore?:string|null; DateEarned?:string|null; BadgeName?:string; }
export interface RetroGameProgress { Title:string; ImageBoxArt?:string; NumPossibleAchievements:number; Achievements:Record<string,RetroAchievement>; }
const API='https://retroachievements.org/API/';
export async function retroRequest<T>(path:string,username:string,key:string,params:Record<string,string>={}):Promise<T>{
 const url=new URL(API+path);url.searchParams.set('u',username);url.searchParams.set('y',key);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
 const response=await fetch(url);if(!response.ok)throw new Error(`RetroAchievements respondeu HTTP ${response.status}.`);const data=await response.json() as T;
 if(data&&typeof data==='object'&&'Error'in data)throw new Error(String((data as {Error:unknown}).Error));return data;
}
export async function storeRetroCredentials(username:string,key:string){if(Capacitor.isNativePlatform())await RetroCredentials.save({value:JSON.stringify({username,key})});else localStorage.setItem('pad2ps_retro_credentials',JSON.stringify({username,key}));}
export async function loadRetroCredentials():Promise<{username:string;key:string}|null>{try{const raw=Capacitor.isNativePlatform()?(await RetroCredentials.load()).value:localStorage.getItem('pad2ps_retro_credentials');return raw?JSON.parse(raw):null;}catch{return null;}}
export async function clearRetroCredentials(){if(Capacitor.isNativePlatform())await RetroCredentials.clear();else localStorage.removeItem('pad2ps_retro_credentials');}
