/**
 * College ERP — Firebase Configuration
 * 
 * ⚠️  IMPORTANT: Replace the placeholder values below with your actual Firebase project config.
 *     Go to Firebase Console → Project Settings → Your apps → Web app → Config
 */
const firebaseConfig = {
  apiKey: "AIzaSyBI1jOJvC0iw2iIebh_CZtLv46Hdv7q81s",
  authDomain: "college-erp-a2a99.firebaseapp.com",
  projectId: "college-erp-a2a99",
  storageBucket: "college-erp-a2a99.firebasestorage.app",
  messagingSenderId: "575607356802",
  appId: "1:575607356802:web:df8cfaa43f9a6f2b86a39b",
  measurementId: "G-3V2JXKB7CM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log('Firebase initialized.');
