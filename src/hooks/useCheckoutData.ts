import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  checkoutApi,
  type CancelCheckoutOrderPayload,
  type CheckoutOrder,
  type CreateCheckoutOrderPayload,
  type CreateTronSessionPayload,
} from '../services/checkout-api';

export function useCheckoutOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['checkout', 'orders', orderId],
    queryFn: () => checkoutApi.getOrder(orderId as string),
    enabled: Boolean(orderId),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCreateCheckoutOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCheckoutOrderPayload) => checkoutApi.createOrder(payload),
    onSuccess: (order: CheckoutOrder) => {
      queryClient.setQueryData(['checkout', 'orders', order.id], order);
    },
  });
}

export function useCreateTronSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: CreateTronSessionPayload }) =>
      checkoutApi.createTronSession(orderId, payload),
    onSuccess: (order: CheckoutOrder) => {
      queryClient.setQueryData(['checkout', 'orders', order.id], order);
    },
  });
}

export function useCancelCheckoutOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload?: CancelCheckoutOrderPayload }) =>
      checkoutApi.cancelOrder(orderId, payload),
    onSuccess: (order: CheckoutOrder) => {
      queryClient.setQueryData(['checkout', 'orders', order.id], order);
    },
  });
}
