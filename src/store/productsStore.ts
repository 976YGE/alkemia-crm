import { create } from 'zustand';
import type { CategoryWithProducts } from '../types';
import { ProductsService } from '../services/products.service';

interface ProductsStore {
  categories: CategoryWithProducts[];
  loading: boolean;
  error: string | null;
  loadProducts: (countryCode: string) => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set) => ({
  categories: [],
  loading: false,
  error: null,
  loadProducts: async (countryCode: string) => {
    set({ loading: true, error: null });
    try {
      const categories = await ProductsService.getProductsGroupedByCategory(countryCode);
      set({ categories, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      });
    }
  }
}));
