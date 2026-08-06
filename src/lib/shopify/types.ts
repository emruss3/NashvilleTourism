export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface StorefrontImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductOptionValue {
  id: string;
  name: string;
}

export interface ProductOption {
  id: string;
  name: string;
  optionValues: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  currentlyNotInStock: boolean;
  selectedOptions: SelectedOption[];
  price: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  image?: StorefrontImage | null;
}

export interface ProductCard {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  availableForSale: boolean;
  featuredImage?: StorefrontImage | null;
  priceRange: {
    minVariantPrice: MoneyV2;
  };
}

export interface Product extends ProductCard {
  images: {
    nodes: StorefrontImage[];
  };
  options: ProductOption[];
  variants: {
    nodes: ProductVariant[];
  };
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: MoneyV2;
    amountPerQuantity: MoneyV2;
  };
  merchandise: ProductVariant & {
    product: {
      title: string;
      handle: string;
    };
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: MoneyV2;
    totalAmount: MoneyV2;
    totalTaxAmount?: MoneyV2 | null;
  };
  lines: {
    nodes: CartLine[];
  };
}

export interface ShopifyUserError {
  field?: string[] | null;
  message: string;
  code?: string | null;
}

export interface ShopifyWarning {
  code: string;
  message: string;
  target?: string | null;
}

export interface CartMutationPayload {
  cart?: Cart | null;
  userErrors: ShopifyUserError[];
  warnings?: ShopifyWarning[];
}
