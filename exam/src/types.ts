export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isAvailable?: boolean;
  type: string;
}
  
  export interface CartItem {
    id: number;
    name: string;
    price: number;
    qty: number;
  }
  
  export interface LoginResponse {
    Token?: string;
    token?: string;
    accessToken?: string;
    jwt?: string;
    Message?: string;
  }
  
  export interface RegisterResponse {
    Message?: string;
    Errors?: string[];
  }
  
  export interface OrderItem {
    productId?: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }
  
  export interface Order {
    id: number;
    createdAt: string;
    totalPrice: number;
    isDelivered: boolean;
    items: OrderItem[];
  }
  
  export interface AuthState {
    token: string | null;
    username: string | null;
  }