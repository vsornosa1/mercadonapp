export interface CartItem {
  productId: number;
  addedAt: string; // ISO timestamp
  checked: boolean; // ticked off in the aisle
  // Deliberately no quantity field: basket totals are out of scope (see SPEC-cart.md).
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}


