import { Order } from "./order.interface";

export interface ProcessedOrders { lastRun: Date, orders: Order[] }