import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { radarApi } from '../services/radar-api';
import type { MarketSummary, Signal, WatchlistResponse } from '../services/radar-api';

/**
 * Hook para dados de mercado (market summary)
 * TTL: 30 segundos (dados voláteis)
 */
export function useMarketSummary() {
  return useQuery({
    queryKey: ['radar', 'market-summary'],
    queryFn: () => radarApi.getMarketSummary(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000, // Refetch a cada minuto
  });
}

/**
 * Hook para sinais de análise
 * TTL: 10 segundos (sinais precisam ser frescos)
 */
export function useSignals(symbol: string, timeframe: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['radar', 'signals', symbol, timeframe],
    queryFn: () => radarApi.getSignals(symbol, timeframe),
    enabled: enabled && !!symbol && !!timeframe,
    staleTime: 10 * 1000, // 10 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para watchlist do usuário
 * TTL: 30 segundos
 */
export function useWatchlist() {
  return useQuery({
    queryKey: ['radar', 'watchlist'],
    queryFn: () => radarApi.getWatchlist(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
  });
}

/**
 * Mutation para adicionar à watchlist
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbol: string) => radarApi.addToWatchlist(symbol),
    onSuccess: () => {
      // Invalidate watchlist query para refetch
      queryClient.invalidateQueries({ queryKey: ['radar', 'watchlist'] });
    },
  });
}

/**
 * Mutation para remover da watchlist
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (symbol: string) => radarApi.removeFromWatchlist(symbol),
    onSuccess: () => {
      // Invalidate watchlist query para refetch
      queryClient.invalidateQueries({ queryKey: ['radar', 'watchlist'] });
    },
  });
}

/**
 * Hook para status do sistema
 * TTL: 5 minutos
 */
export function useSystemStatus() {
  return useQuery({
    queryKey: ['radar', 'system-status'],
    queryFn: () => radarApi.getSystemStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 3,
  });
}
