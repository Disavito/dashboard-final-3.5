import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';

/**
 * Hook para obtener y mantener en tiempo real el número de solicitudes de eliminación pendientes.
 * Solo funciona para usuarios con rol 'admin'.
 */
const usePendingRequestsCount = () => {
    const { roles, loading } = useUser();
    const isAdmin = roles?.includes('admin');
    const [pendingCount, setPendingCount] = useState(0);
    const [isFetching, setIsFetching] = useState(true);

    const fetchCount = useCallback(async () => {
        if (!isAdmin) {
            setPendingCount(0);
            setIsFetching(false);
            return;
        }

        setIsFetching(true);
        
        // Usamos count: 'exact' para obtener el número total de filas que cumplen el filtro.
        const { count, error } = await supabase
            .from('document_deletion_requests')
            .select('*', { count: 'exact', head: true })
            .eq('request_status', 'Pending');

        if (error) {
            console.error('Error fetching pending requests count:', error);
            setPendingCount(0);
        } else {
            setPendingCount(count || 0);
        }
        setIsFetching(false);
    }, [isAdmin]);

    useEffect(() => {
        if (loading) return;

        // 1. Obtener el conteo inicial
        fetchCount();

        if (isAdmin) {
            console.log('Admin Count Listener: Subscribing to document_deletion_requests changes.');

            // 2. Suscribirse a cambios en la tabla
            const channel = supabase
                .channel('pending-requests-count-channel')
                .on(
                    'postgres_changes',
                    { 
                        event: '*', // Escuchar INSERT, UPDATE, DELETE
                        schema: 'public', 
                        table: 'document_deletion_requests' 
                    },
                    (payload) => {
                        console.log('Realtime change detected for requests count. Refetching.', payload.eventType);
                        // Refetch el conteo cuando se inserta, aprueba o rechaza una solicitud.
                        fetchCount();
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Admin Count Listener: Successfully subscribed.');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('Admin Count Listener: Channel error.');
                    }
                });

            // 3. Limpieza
            return () => {
                console.log('Admin Count Listener: Unsubscribing.');
                supabase.removeChannel(channel);
            };
        }
    }, [isAdmin, loading, fetchCount]);

    return { pendingCount, isFetching, isAdmin };
};

export default usePendingRequestsCount;
