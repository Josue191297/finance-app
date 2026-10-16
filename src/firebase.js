import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { initializeFirestore, persistentLocalCache } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAN8gU65IvxwRi-oA1Ogzx6IfjJpTqHgks",
  authDomain: "finance-app-5f72d.firebaseapp.com",
  projectId: "finance-app-5f72d",
  storageBucket: "finance-app-5f72d.firebasestorage.app",
  messagingSenderId: "498850633611",
  appId: "1:498850633611:web:d6305be31e566b91f3018e"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
})

// Keep in sync with the email list in firestore.rules.
export const PEOPLE = {
  "josuesalazar1912@gmail.com": "Josue",
  "larissawawis@gmail.com": "Larissa",
}

export const hasAccess = (user) =>
  Boolean(user && user.emailVerified && PEOPLE[user.email])
