//firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAdeWBQioM3kLk2E-laJZEHRrcXByomoDg',
  authDomain: 'calendereventmanagement.firebaseapp.com',
  projectId: 'calendereventmanagement',
  storageBucket: 'calendereventmanagement.firebasestorage.app',
  messagingSenderId: '435059690315',
  appId: '1:435059690315:web:8fc1ec122a29afe31276ce'
}
firebase.initializeApp(firebaseConfig)

const db = firebase.firestore()
