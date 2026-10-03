/*
 * Shared types, kept out of *.server.ts so client components can import
 * them without tripping the server import guard.
 */

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_path: string | null;
}

export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";
export type Fulfilment = "delivery" | "pickup";

export interface Order {
  id: number;
  user_id: number;
  status: OrderStatus;
  fulfilment: Fulfilment;
  address: string | null;
  phone: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
}

export interface OrderLine {
  id: number;
  order_id: number;
  product_id: number;
  name: string;
  price: number;
  qty: number;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
}
