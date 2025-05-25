export const API_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  CHECK_TOKEN: '/auth/check-status',
  CHECK_EMAIL: '/auth/check-email',

  CONSUMER_PRODUCTS: '/products/consumer-products',
  CREATE_VENDOR_PRODUCTS: '/products/create',
  FIND_VENDOR_PRODUCTS: '/products/vendor-products',
  GET_VENDOR_PRODUCT: '/products',
  UPDATE_VENDOR_PRODUCT: '/products/update-product',
  GET_PRODUCT_DETAIL: '/products',

  GET_CATEGORIES: '/categories',

  POST_IMAGES: '/cloudinary/upload-multiple',
  POST_VISUAL_REPRESENTATION: '/visual-representation',
  GET_PRINCIPAL_IMAGE: '/visual-representation/principal-image',
  GET_ALL_IMAGES: '/visual-representation/images',
  DELETE_VISUAL_REPRESENTATION: '/visual-representation',
} as const;
