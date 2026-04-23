/**
 * College ERP — Authentication (Firebase)
 * Firebase Auth with Email/Password + Google Sign-In
 */
const Auth = (() => {
  let _cachedUser = null;

  /** Get cached current user (synchronous, available after guard resolves) */
  function currentUser() { return _cachedUser; }

  /** Check role */
  function hasRole(role) { return _cachedUser && _cachedUser.role === role; }

  /** Get base path depending on page location */
  function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
  }

  /** Login with email & password */
  async function loginWithEmail(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const profile = await _getProfile(cred.user.uid);
    if (!profile) throw new Error('No user profile found. Please register first.');
    _cachedUser = profile;
    return profile;
  }

  /** Login with Google (one-click popup) */
  async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const profile = await _getProfile(result.user.uid);
    if (!profile) {
      // First-time Google user — return user info for registration
      return { isNew: true, uid: result.user.uid, email: result.user.email, name: result.user.displayName || '' };
    }
    _cachedUser = profile;
    return profile;
  }

  /** Register a new account (email/password) + create Firestore profile */
  async function register(email, password, profileData) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const profile = { uid: cred.user.uid, email, ...profileData, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('users').doc(cred.user.uid).set(profile);
    _cachedUser = { id: cred.user.uid, ...profile };
    return _cachedUser;
  }

  /** Complete profile for Google sign-in users (profile doc already has uid) */
  async function completeGoogleProfile(uid, email, profileData) {
    const profile = { uid, email, ...profileData, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('users').doc(uid).set(profile);
    _cachedUser = { id: uid, ...profile };
    return _cachedUser;
  }

  /** Admin creates an account for a student/faculty */
  async function adminCreateAccount(email, password, profileData) {
    // We must use a secondary Firebase app instance to create a user.
    // Otherwise, the client SDK automatically signs in the new user, logging out the Admin.
    let secondaryApp;
    try {
      secondaryApp = firebase.app("SecondaryApp");
    } catch (e) {
      secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
    }
    
    try {
      const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      const newUid = cred.user.uid;
      const profile = { uid: newUid, email, ...profileData, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      
      // Use the primary db connection to save the profile
      await db.collection('users').doc(newUid).set(profile);
      
      // Sign out of the secondary app
      await secondaryApp.auth().signOut();
      return { id: newUid, ...profile };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /** Logout */
  async function logout() {
    _cachedUser = null;
    await auth.signOut();
    window.location.href = getBasePath() + 'index.html';
  }

  /** Auth guard — returns Promise<user|null>. Redirects if not authorized. */
  function guard(allowedRoles = []) {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        unsubscribe();
        if (!firebaseUser) {
          window.location.href = getBasePath() + 'index.html';
          resolve(null);
          return;
        }
        const profile = await _getProfile(firebaseUser.uid);
        if (!profile) {
          window.location.href = getBasePath() + 'index.html';
          resolve(null);
          return;
        }
        if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
          window.location.href = getBasePath() + 'pages/dashboard.html';
          resolve(null);
          return;
        }
        _cachedUser = profile;
        resolve(profile);
      });
    });
  }

  /** Get user profile from Firestore */
  async function _getProfile(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { console.error('_getProfile:', e); return null; }
  }

  /** Login using Student/Faculty ID instead of email */
  async function loginWithId(role, id, password) {
    const collection = role === 'faculty' ? 'faculty' : 'students';
    const idField = role === 'faculty' ? 'facultyId' : 'studentId';
    
    const snapshot = await db.collection(collection).where(idField, '==', id).get();
    if (snapshot.empty) {
      throw new Error(`Invalid ${role === 'faculty' ? 'Faculty' : 'Student'} ID`);
    }
    
    const data = snapshot.docs[0].data();
    if (!data.email) {
      throw new Error('No email associated with this ID');
    }
    
    return loginWithEmail(data.email, password);
  }

  /** Send password reset email */
  async function forgotPassword(idOrEmail, role = 'admin') {
    let email = idOrEmail;
    
    if (role !== 'admin') {
        const collection = role === 'faculty' ? 'faculty' : 'students';
        const idField = role === 'faculty' ? 'facultyId' : 'studentId';
        const snapshot = await db.collection(collection).where(idField, '==', idOrEmail).get();
        if (snapshot.empty) throw new Error(`Invalid ${role} ID`);
        email = snapshot.docs[0].data().email;
    }
    
    if (!email) throw new Error('No email found for this user');
    await auth.sendPasswordResetEmail(email);
    return true;
  }

  return { currentUser, hasRole, getBasePath, loginWithEmail, loginWithId, forgotPassword, loginWithGoogle, register, completeGoogleProfile, adminCreateAccount, logout, guard };
})();
