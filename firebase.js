import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyALORSwt7hBP4sIuNeFCXEM6OQq-SWHuog",
    authDomain: "ai-trending-pic.firebaseapp.com",
    projectId: "ai-trending-pic",
    storageBucket: "ai-trending-pic.firebasestorage.app",
    messagingSenderId: "878709396920",
    appId: "1:878709396920:web:8bee07d839c6f70c0a6b4d"
};


// Firebase start
const app = initializeApp(firebaseConfig);


// Firestore start
const db = getFirestore(app);


// Prompts Firebase se lana
async function getFirebasePrompts() {

    const snapshot = await getDocs(
        collection(db, "prompts")
    );

    const firebasePrompts = [];

    snapshot.forEach((doc) => {

        firebasePrompts.push({
            id: doc.id,
            ...doc.data()
        });

    });

    return firebasePrompts;
}


export {
    app,
    db,
    getFirebasePrompts
};