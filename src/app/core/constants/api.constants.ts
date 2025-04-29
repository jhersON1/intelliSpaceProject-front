export const API_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  CHECK_TOKEN: '/auth/check-status',
  CHECK_EMAIL: '/auth/check-email',
  CONSUMER_PRODUCTS: '/products/consumer-products',
  CREATE_VENDOR_PRODUCTS: '/products/create',
  FIND_VENDOR_PRODUCTS: '/products/vendor-products',
} as const;
