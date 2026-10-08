export interface CartItem {
  productId: number;
  addedAt: string; // ISO timestamp
  checked: boolean; // ticked off in the aisle
  quantity: number; // how many; at least one, because "none" means removed
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}


