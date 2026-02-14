import { supabase } from '@/lib/supabaseClient';

export interface DeletionRequestInput {
    document_id: string;
    document_type: string;
    document_link: string;
    socio_id: string;
    requested_by: string;
    requested_by_email: string;
}

export const createDeletionRequest = async (input: DeletionRequestInput) => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .insert([
            {
                document_id: input.document_id,
                document_type: input.document_type,
                document_link: input.document_link,
                socio_id: input.socio_id,
                requested_by: input.requested_by,
                requested_by_email: input.requested_by_email,
                request_status: 'Pending'
            }
        ])
        .select();

    if (error) throw error;
    return data;
};

export const fetchDeletionRequests = async () => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
            *,
            socio_details:socio_titulares(nombres, apellidoPaterno, dni)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const updateDeletionRequestStatus = async (
    requestId: string, 
    status: 'Approved' | 'Rejected',
    adminId: string
) => {
    const { error } = await supabase
        .from('document_deletion_requests')
        .update({
            request_status: status,
            processed_at: new Date().toISOString(),
            processed_by: adminId
        })
        .eq('id', requestId);

    if (error) throw error;
};
