// lib/firebaseConfig.ts
// Firebaseプロジェクト(wanted-watch)の初期化。
// apiKeyなどはクライアント用の公開情報であり、秘密情報ではない
// (アクセス制御はFirestoreのセキュリティルール側で行う)。

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD4Cudv-gVG7_83h5jKGpBeoX6at4pum6k',
  authDomain: 'wanted-watch-d7b14.firebaseapp.com',
  projectId: 'wanted-watch-d7b14',
  storageBucket: 'wanted-watch-d7b14.firebasestorage.app',
  messagingSenderId: '1067310304741',
  appId: '1:1067310304741:web:419936ad2b94976457730c',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
