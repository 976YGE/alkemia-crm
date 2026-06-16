import { supabase } from '../lib/supabase';
import type { Product, ProductCategory, CategoryWithProducts, ProductWithQuantity } from '../types';

export class ProductsService {
  static async getProductsByCountry(countryCode: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('country_code', countryCode)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getCategoriesByCountry(countryCode: string): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('country_code', countryCode)
      .eq('active', true)
      .order('display_order')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getProductsGroupedByCategory(countryCode: string): Promise<CategoryWithProducts[]> {
    const products = await this.getProductsByCountry(countryCode);
    const categories = await this.getCategoriesByCountry(countryCode);

    return categories.map(category => {
      const categoryProducts: ProductWithQuantity[] = products
        .filter(p => p.category_id === category.id)
        .map(p => ({ ...p, quantity: 0 }));

      return {
        category,
        products: categoryProducts
      };
    }).filter(group => group.products.length > 0);
  }

  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
