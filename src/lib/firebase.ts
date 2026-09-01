import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { environment } from './environment.js';

export const app = initializeApp(environment.firebase);
export const analytics = getAnalytics(app);
