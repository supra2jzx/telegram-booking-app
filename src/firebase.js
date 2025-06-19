// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Импортируем только getFirestore

const firebaseConfig = {
  apiKey: "AIzaSyDa0EQtELva2CWr1Qa11KU-Fv6holEHoTY",
  authDomain: "samal-beaf6.firebaseapp.com",
  projectId: "samal-beaf6",
  storageBucket: "samal-beaf6.firebasestorage.app",
  messagingSenderId: "66622294153",
  appId: "1:66622294153:web:2db67ff6d6a4a61f641e58",
  measurementId: "G-Z33DV7HSH7" // Можно оставить, если понадобится в будущем, но сейчас не используется
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Инициализируем Firestore

export { db }; // Экспортируем только db
