import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBf4r0ZYllayZq8pvtxj00uz6DghMRjJtg",
    authDomain: "simulasi-mafia.firebaseapp.com",
    projectId: "simulasi-mafia",
    storageBucket: "simulasi-mafia.firebasestorage.app",
    messagingSenderId: "521663445985",
    appId: "1:521663445985:web:f77f967e7c40bd340c30a0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Ambil semua klaim kota pemain global
export async function fetchGlobalOccupiedCities() {
    try {
        const snap = await getDoc(doc(db, "meta", "occupied_cities"));
        if (snap.exists()) {
            return snap.data().map || {};
        }
        return {};
    } catch (err) {
        console.error("Fetch cities error:", err);
        return {};
    }
}

// Daftarkan kota basecamp pemain ke database global (Multiplayer Claim)
export async function claimBasecampGlobal(cityName, uid, username) {
    try {
        const ref = doc(db, "meta", "occupied_cities");
        const snap = await getDoc(ref);
        let map = snap.exists() ? (snap.data().map || {}) : {};

        if (map[cityName] && map[cityName].uid !== uid) {
            return { success: false, message: `Kota ${cityName} sudah diklaim oleh ${map[cityName].username}!` };
        }

        map[cityName] = { uid, username };
        await setDoc(ref, { map }, { merge: true });
        return { success: true };
    } catch (err) {
        console.error("Claim city error:", err);
        return { success: false, message: err.message };
    }
}

export async function loadUserDataFromCloud(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) return docSnap.data();
        return null;
    } catch (err) {
        console.error("Load user error:", err);
        return null;
    }
}

export async function saveUserDataToCloud(uid, gameState) {
    try {
        await setDoc(doc(db, "users", uid), gameState, { merge: true });
    } catch (err) {
        console.error("Save user error:", err);
    }
}
