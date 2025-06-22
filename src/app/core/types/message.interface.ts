export interface Message {
  id: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  consumerId: string;
  vendorId: string;
  productId: string;
  consumer: {
    id: string;
    name: string;
    lastname: string;
    email: string;
    avatar?: string;
  };
  vendor: {
    id: string;
    name: string;
    lastname: string;
    email: string;
    nameBusiness: string;
  };
  product: {
    id: string;
    title: string;
    price: number;
  };
}

export interface CreateMessageRequest {
  subject: string;
  content: string;
  productId: string;
  vendorId: string;
}

export interface UnreadCountResponse {
  count: number;
}
