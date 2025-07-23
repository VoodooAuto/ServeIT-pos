import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
admin.initializeApp();

const db = admin.firestore();

export const deductIngredientsOnOrder = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, _context: functions.EventContext) => {
    const order = snap.data();
    if (!order || !order.items) return;

    for (const orderItem of order.items) {
      // Fetch the menu item to get its recipe
      const menuQuery = await db.collection("menuItems").where("name", "==", orderItem.menuItem.name).limit(1).get();
      if (menuQuery.empty) continue;
      const menuItem = menuQuery.docs[0].data();

      if (menuItem.recipe && Array.isArray(menuItem.recipe)) {
        for (const ingredient of menuItem.recipe) {
          // Find the ingredient in the ingredients collection
          const ingQuery = await db.collection("ingredients").where("name", "==", ingredient.name).limit(1).get();
          if (ingQuery.empty) continue;
          const ingDoc = ingQuery.docs[0];
          const ingData = ingDoc.data();

          // Parse quantity as a number (basic version, assumes simple numbers)
          const qtyToDeduct = parseFloat(ingredient.quantity) * (orderItem.quantity || 1);
          if (!isNaN(qtyToDeduct) && ingData.quantity !== undefined) {
            await ingDoc.ref.update({
              quantity: Math.max(0, ingData.quantity - qtyToDeduct)
            });
          }
        }
      }
    }
    return null;
  }); 