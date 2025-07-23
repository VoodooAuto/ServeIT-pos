import Papa from 'papaparse';
import { bulkUploadMenuItems } from './bulkUploadMenuItems';
import type { MenuItemUpload } from './bulkUploadMenuItems';

export async function uploadMenuItemsFromCSV(csvString: string) {
  return new Promise<{ success: number; failed: number; errors: string[] }>((resolve, reject) => {
    Papa.parse<MenuItemUpload>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<MenuItemUpload>) => {
        try {
          const uploadResults = await bulkUploadMenuItems(results.data);
          resolve(uploadResults);
        } catch (err) {
          reject(err);
        }
      },
      error: (err: Papa.ParseError) => reject(err),
    });
  });
} 