import { supabase } from '../lib/supabase';
import { CountryCode, Product, ProductCategory } from '../types';

export interface CategoryWithProductCount extends ProductCategory {
  product_count: number;
}

const COUNTRIES: CountryCode[] = ['FR', 'ES', 'IT', 'BE', 'CH'];

export const ProductsAdminService = {
  async getAllCategories(): Promise<CategoryWithProductCount[]> {
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('country_code')
      .order('display_order');

    if (error) throw error;

    const { data: products } = await supabase
      .from('products')
      .select('id, category_id');

    const countMap = new Map<string, number>();
    products?.forEach(p => {
      countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
    });

    return (categories || []).map(c => ({
      ...c,
      product_count: countMap.get(c.id) || 0,
    }));
  },

  async updateCategory(id: string, updates: Partial<Pick<ProductCategory, 'name' | 'primary_color' | 'secondary_color' | 'display_order' | 'active'>>): Promise<void> {
    const { error } = await supabase
      .from('product_categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async createCategory(data: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ProductCategory> {
    const { data: created, error } = await supabase
      .from('product_categories')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async getAllProducts(): Promise<Product[]> {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, category:product_categories(*)')
      .order('country_code')
      .order('name');

    if (error) throw error;
    return products || [];
  },

  async updateProduct(id: string, updates: Partial<Pick<Product, 'name' | 'code' | 'ean' | 'price' | 'active'>>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
    const { data: created, error } = await supabase
      .from('products')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  getCountries(): CountryCode[] {
    return COUNTRIES;
  },
};
