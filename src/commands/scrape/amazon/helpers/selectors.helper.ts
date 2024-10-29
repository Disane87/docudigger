import { AmazonSelectors } from "../../../../interfaces/selectors.interface";

export const amazonSelectors: AmazonSelectors = {
  orderCards: `div.order.js-order-card`,
  invoiceSpans: `span.hide-if-no-js .a-declarative[data-action="a-popover"]`,
  orderNr: `.yohtmlc-order-id span:nth-last-child(1) bdi`,
  orderDate: `.a-column .a-row:nth-last-child(1) span`,
  popover: `#a-popover-content-{{index}}`,
  invoiceList: `ul.invoice-list`,
  invoiceLinks: `a[href*="invoice.pdf"]`,
  pagination: `ul.a-pagination li.a-normal:nth-last-child(2) a`,
  yearFilter: `select[name="orderFilter"]#orderFilter`,
  authError: `#auth-error-message-box .a-unordered-list li`,
  authWarning: `#auth-warning-message-box .a-unordered-list li`,
  captchaImage: `div.cvf-captcha-img img[alt~="captcha"]`,
};
