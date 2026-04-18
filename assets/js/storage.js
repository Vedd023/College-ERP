/**
 * College ERP — Storage Engine (Firestore)
 * Async CRUD operations over Cloud Firestore
 */
const Store = (() => {
  async function getItems(collection) {
    try {
      const snapshot = await db.collection(collection).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error('getItems:', e); return []; }
  }

  async function getItemById(collection, id) {
    try {
      const doc = await db.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { return null; }
  }

  async function createItem(collection, data) {
    const itemData = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (data.id) {
      const docId = data.id; delete itemData.id;
      await db.collection(collection).doc(docId).set(itemData);
      return { id: docId, ...itemData };
    } else {
      const ref = await db.collection(collection).add(itemData);
      return { id: ref.id, ...itemData };
    }
  }

  async function updateItem(collection, id, data) {
    const d = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    delete d.id;
    await db.collection(collection).doc(id).update(d);
    return { id, ...d };
  }

  async function deleteItem(collection, id) {
    await db.collection(collection).doc(id).delete();
    return true;
  }

  async function query(collection, filterFn) {
    return (await getItems(collection)).filter(filterFn);
  }

  async function queryWhere(collection, field, op, value) {
    const snapshot = await db.collection(collection).where(field, op, value).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function isSeeded() {
    try { const d = await db.collection('_meta').doc('seeded').get(); return d.exists; } catch { return false; }
  }

  async function markSeeded() {
    await db.collection('_meta').doc('seeded').set({ done: true });
  }

  async function seed(collection, items) {
    const existing = await getItems(collection);
    if (existing.length > 0) return;
    const batch = db.batch();
    items.forEach(item => {
      const docId = item.id || db.collection(collection).doc().id;
      const data = { ...item }; delete data.id;
      batch.set(db.collection(collection).doc(docId), data);
    });
    await batch.commit();
  }

  function generateId() { return db.collection('_').doc().id; }

  return { getItems, getItemById, createItem, updateItem, deleteItem, query, queryWhere, isSeeded, markSeeded, seed, generateId };
})();
