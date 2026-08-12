import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { addCartItem, getCart, removeCartItem, updateCartItem } from "./api";
import type { CartView } from "./types";

interface CartState {
  cart: CartView | null;
  loading: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

/**
 * Estado do carrinho compartilhado entre o header (contador) e as
 * páginas de produto/carrinho — evita cada componente buscar o
 * carrinho de novo depois de toda mutação.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getCart();
    setCart(data);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    const data = await addCartItem(variantId, quantity);
    setCart(data);
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const data = await updateCartItem(itemId, quantity);
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const data = await removeCartItem(itemId);
    setCart(data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateItem, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
