import { getCategories } from './app/actions/category';
import { getProducts } from './app/actions/product';

async function main() {
  console.log('Testing categories...');
  const cats = await getCategories();
  console.log('Categories:', cats);
  console.log('Testing products...');
  const prods = await getProducts();
  console.log('Products:', prods);
}
main().catch(console.error);
