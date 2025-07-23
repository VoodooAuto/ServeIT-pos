import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export async function getEstablishmentType(): Promise<string> {
  const ref = doc(db, 'settings', 'restaurant');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return data.establishmentType || 'QSR';
  }
  return 'QSR'; // default
}

const EstablishmentTypeContext = createContext<string>('QSR');

export function EstablishmentTypeProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<string>('QSR');
  useEffect(() => {
    getEstablishmentType().then(setType);
  }, []);
  return (
    <EstablishmentTypeContext.Provider value={type}>
      {children}
    </EstablishmentTypeContext.Provider>
  );
}

export function useEstablishmentType() {
  return useContext(EstablishmentTypeContext);
}