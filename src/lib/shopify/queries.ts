const IMAGE_FIELDS = `
  fragment StorefrontImageFields on Image {
    url
    altText
    width
    height
  }
`;

const MONEY_FIELDS = `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const PRODUCT_CARD_FIELDS = `
  ${IMAGE_FIELDS}
  ${MONEY_FIELDS}
  fragment ProductCardFields on Product {
    id
    handle
    title
    description(truncateAt: 240)
    productType
    vendor
    availableForSale
    featuredImage {
      ...StorefrontImageFields
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FIELDS}
  query Products($first: Int!) @inContext(country: US, language: EN) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCardFields
      }
    }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FIELDS}
  query CollectionProducts($handle: String!, $first: Int!) @inContext(country: US, language: EN) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: $first) {
        nodes {
          ...ProductCardFields
        }
      }
    }
  }
`;

export const PRODUCT_QUERY = `
  ${PRODUCT_CARD_FIELDS}
  query Product($handle: String!) @inContext(country: US, language: EN) {
    product(handle: $handle) {
      ...ProductCardFields
      description
      images(first: 12) {
        nodes {
          ...StorefrontImageFields
        }
      }
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      variants(first: 100) {
        nodes {
          id
          title
          availableForSale
          currentlyNotInStock
          selectedOptions {
            name
            value
          }
          price {
            ...MoneyFields
          }
          compareAtPrice {
            ...MoneyFields
          }
          image {
            ...StorefrontImageFields
          }
        }
      }
    }
  }
`;

const CART_FIELDS = `
  ${IMAGE_FIELDS}
  ${MONEY_FIELDS}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        ...MoneyFields
      }
      totalAmount {
        ...MoneyFields
      }
      totalTaxAmount {
        ...MoneyFields
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            ...MoneyFields
          }
          amountPerQuantity {
            ...MoneyFields
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            currentlyNotInStock
            selectedOptions {
              name
              value
            }
            price {
              ...MoneyFields
            }
            compareAtPrice {
              ...MoneyFields
            }
            image {
              ...StorefrontImageFields
            }
            product {
              title
              handle
            }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = `
  ${CART_FIELDS}
  query Cart($cartId: ID!) @inContext(country: US, language: EN) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
`;

export const CART_CREATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartCreate($input: CartInput) @inContext(country: US, language: EN) {
    cartCreate(input: $input) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_LINES_ADD_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) @inContext(country: US, language: EN) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) @inContext(country: US, language: EN) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = `
  ${CART_FIELDS}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) @inContext(country: US, language: EN) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
      warnings {
        code
        message
        target
      }
    }
  }
`;
