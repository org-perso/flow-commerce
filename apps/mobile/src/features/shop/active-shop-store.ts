import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ActiveShopState = {
  /** Last shop picked by each Firebase user, remembered across restarts. */
  byUser: Record<string, string>;
  setActiveShop: (uid: string, shopId: string) => void;
};

export const useActiveShopStore = create<ActiveShopState>()(
  persist(
    (set) => ({
      byUser: {},
      setActiveShop: (uid, shopId) => set((s) => ({ byUser: { ...s.byUser, [uid]: shopId } })),
    }),
    { name: 'active-shop', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
