// Import the functions you need from the SDKs you need
import {
    initializeApp
} from "firebase/app";
import {
    getAnalytics
} from "firebase/analytics";
import {
    getFirestore
} from "firebase/firestore";


import { useCollection } from 'vuefire'

const firebaseConfig = {
    apiKey: "AIzaSyCaP18xs7g2cYP-w0sao7H5tsVd8RCO8k4",
    authDomain: "orders-server.firebaseapp.com",
    projectId: "orders-server",
    storageBucket: "orders-server.appspot.com",
    messagingSenderId: "7023564218",
    appId: "1:7023564218:web:f4a01b1bca7e02105af983",
    measurementId: "G-T0WPZQ5CW0",
};



// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp)

const analytics = getAnalytics(firebaseApp);
