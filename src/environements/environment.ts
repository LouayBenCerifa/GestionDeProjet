import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

export const environment = {
  production: false,

  firebaseConfig: {
    apiKey: "AIzaSyA9Ip52VC7NQ6gOJMmr-TrBY49lO6q7lrU",
    authDomain: "taskmanager-81835.firebaseapp.com",
    projectId: "taskmanager-81835",
    storageBucket: "taskmanager-81835.firebasestorage.app",
    messagingSenderId: "320703982042",
    appId: "1:320703982042:web:20326e3a93f401e419b8e3",
    measurementId: "G-SF5GD11P1X"
  }
};

// Firebase init
export const app = initializeApp(environment.firebaseConfig);
export const analytics = getAnalytics(app);
