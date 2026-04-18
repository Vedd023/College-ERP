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
    // Save current admin user
    const adminUser = auth.currentUser;
    // Create the new account
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const newUid = cred.user.uid;
    const profile = { uid: newUid, email, ...profileData, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('users').doc(newUid).set(profile);
    // Sign out new user and sign back in as admin — admin session is lost
    // Note: In production, use Firebase Admin SDK. For client-side, we re-auth the admin.
    await auth.signOut();
    return { id: newUid, ...profile };
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

  return { currentUser, hasRole, getBasePath, loginWithEmail, loginWithGoogle, register, completeGoogleProfile, adminCreateAccount, logout, guard };
})();
