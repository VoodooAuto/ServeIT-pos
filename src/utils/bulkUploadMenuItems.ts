import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export interface MenuItemUpload {
  name: string;
  price: number;
  category?: string;
  description?: string;
  available?: boolean;
  [key: string]: any;
}

export async function bulkUploadMenuItems(items: MenuItemUpload[]) {
  const results = { success: 0, failed: 0, errors: [] as string[] };
  for (const item of items) {
    try {
      await addDoc(collection(db, 'menuItems'), {
        ...item,
        available: item.available !== undefined ? item.available : true,
      });
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(`Failed to upload item '${item.name}': ${(err as Error).message}`);
    }
  }
  return results;
} 