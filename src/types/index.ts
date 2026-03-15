import { z } from "zod";
import type {
  Role,
  DriverStatus,
  OrderStatus,
  VoucherStatus,
  PaymentStatus,
  ActorType,
} from "@prisma/client";

// ---- Re-export Prisma enums for convenience ----
export type { Role, DriverStatus, OrderStatus, VoucherStatus, PaymentStatus, ActorType };

// ---- Entity types (plain objects, no Prisma decorators) ----

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverDTO {
  id: string;
  userId: string;
  vehicleType: string;
  status: DriverStatus;
  rating: number;
  cancellationCount: number;
  latitude?: number | null;
  longitude?: number | null;
  locationUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreDTO {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAddressDTO {
  id: string;
  userId: string;
  label?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  driverId?: string | null;
  deliveryAddressId: string;
  status: OrderStatus;
  distanceKm: number;
  deliveryFee: number; // cents
  qrPayload?: string | null;
  qrExpiresAt?: Date | null;
  paymentToken?: string | null;
  cancelledReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  voucherCode?: string | null;
  voucherImageUrl?: string | null;
  smoothieItem: string;
  voucherStatus: VoucherStatus;
  replacementDeadline?: Date | null;
  createdAt: Date;
}

export interface PaymentDTO {
  id: string;
  orderId: string;
  amount: number; // cents
  driverAmount: number; // cents
  platformAmount: number; // cents
  status: PaymentStatus;
  payfastToken?: string | null;
  payfastPaymentId?: string | null;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  category?: string | null;
  isAvailable: boolean;
  createdAt: Date;
}

// ---- Zod validation schemas ----

export const RegisterCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterDriverSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email().toLowerCase(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    vehicleType: z.enum(["bicycle", "motorcycle", "car", "scooter"], {
      errorMap: () => ({ message: "Invalid vehicle type" }),
    }),
  });
export type RegisterDriverInput = z.infer<typeof RegisterDriverSchema>;

export const DeliveryAddressSchema = z.object({
  label: z.string().max(50).optional(),
  address: z.string().min(5, "Address is required").max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().optional().default(false),
});
export type DeliveryAddressInput = z.infer<typeof DeliveryAddressSchema>;

export const CreateOrderSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
  deliveryAddressId: z.string().uuid("Invalid delivery address ID"),
  items: z
    .array(
      z.object({
        smoothieItem: z.string().min(1, "Smoothie item is required").max(100),
        voucherCode: z.string().min(1, "Voucher code is required").max(50),
        voucherImageUrl: z.string().url("Invalid image URL").optional(),
      }),
    )
    .min(1, "At least one item is required")
    .max(10, "Maximum 10 items per order"),
  paymentToken: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const UpdateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

export const UpdateDriverStatusSchema = z.object({
  status: z.enum(["available", "offline"] as const),
});
export type UpdateDriverStatusInput = z.infer<typeof UpdateDriverStatusSchema>;

export const UploadFileSchema = z.object({
  bucket: z.enum(["vouchers", "receipts"]),
  orderId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
});

// ---- Pagination ----
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

// ---- API response types ----
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
