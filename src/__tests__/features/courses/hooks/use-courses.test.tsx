import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  useCourseNameMap,
  useCourseNames,
  useCourses,
} from '@/features/courses/hooks/use-courses';

const { mockFrom, mockSelect, mockOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn().mockReturnThis(),
  mockSelect: vi.fn().mockReturnThis(),
  mockOrder: vi.fn(),
}));

vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: mockFrom,
    select: mockSelect,
    order: mockOrder,
  },
}));

const mockCourseNames = [
  { id: '1', name: 'React Basics' },
  { id: '2', name: 'Advanced TypeScript' },
];

const mockCoursesFull = [
  { id: '1', name: 'React Basics', sort_order: 1 },
  { id: '2', name: 'Advanced TypeScript', sort_order: 2 },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCourseNames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('başarı: id ve name alanlarını içeren listeyi döndürür', async () => {
    mockOrder.mockResolvedValueOnce({ data: mockCourseNames, error: null });

    const { result } = renderHook(() => useCourseNames(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCourseNames);
    expect(mockFrom).toHaveBeenCalledWith('courses');
    expect(mockSelect).toHaveBeenCalledWith('id, name');
    expect(mockOrder).toHaveBeenCalledWith('name');
  });

  it('boş veri: data null olduğunda boş dizi döndürür', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useCourseNames(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('hata: Supabase error döndüğünde isError durumuna geçer', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useCourseNames(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('başarı: tüm kurs detaylarını sort_order sırasında döndürür', async () => {
    mockOrder.mockResolvedValueOnce({ data: mockCoursesFull, error: null });

    const { result } = renderHook(() => useCourses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCoursesFull);
    expect(result.current.data?.[0].sort_order).toBe(1);
    expect(result.current.data?.[1].sort_order).toBe(2);
    expect(mockOrder).toHaveBeenCalledWith('sort_order');
  });

  it('hata: Supabase error döndüğünde isError durumuna geçer', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Fetch failed' },
    });

    const { result } = renderHook(() => useCourses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useCourseNameMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('veriyi Map objesine dönüştürür (id -> name)', async () => {
    mockOrder.mockResolvedValueOnce({ data: mockCourseNames, error: null });

    const { result } = renderHook(() => useCourseNameMap(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.size).toBe(2));

    expect(result.current.get('1')).toBe('React Basics');
    expect(result.current.get('2')).toBe('Advanced TypeScript');
    expect(result.current).toBeInstanceOf(Map);
  });
});
