import { useQuery } from '@tanstack/react-query';
import { getNote } from '@/lib/notes';

export const useNotes = (slug: string) => {
    return useQuery({
        queryKey: ['notes', slug],
        queryFn: async () => {
            const data = await getNote(slug);
            return data;
        },
        enabled: !!slug,
    });
};

