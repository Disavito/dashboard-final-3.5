import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { fetchSocioDocuments, searchSocios, SocioDocument } from '@/lib/supabase/documents';
import { createDeletionRequest } from '@/lib/supabase/documentRequests';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Search, 
  FileText, 
  Map as MapIcon, 
  Upload, 
  Trash2, 
  Eye, 
  Loader2, 
  FileSignature,
  FileCheck,
  Receipt,
  Lock,
  Sparkles
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentManagerProps {
  isAdmin: boolean;
}

export default function DocumentManager({ isAdmin }: DocumentManagerProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [documents, setDocuments] = useState<SocioDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<ManualDocumentType | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<SocioDocument | null>(null);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  useEffect(() => {
    if (!isAdmin || !searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSocios(searchQuery);
        setSearchResults(results || []);
      } catch (error) { console.error(error); }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isAdmin]);

  useEffect(() => {
    if (selectedSocio) loadDocuments(selectedSocio.id);
  }, [selectedSocio]);

  const loadDocuments = async (socioId: string) => {
    setLoadingDocs(true);
    try {
      const docs = await fetchSocioDocuments(socioId);
      setDocuments(docs || []);
    } catch (error) {
      toast.error('Error al cargar documentos');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadClick = (type: ManualDocumentType) => {
    if (!selectedSocio) return;
    setUploadDocType(type);
    setIsUploadModalOpen(true);
  };

  const renderDocumentCard = (
    type: string, 
    icon: React.ReactNode,
    allowManualUpload: boolean = false
  ) => {
    const doc = documents.find(d => d.tipo_documento === type);
    const exists = !!doc;

    return (
      <Card className={`relative overflow-hidden border transition-all duration-300 ${exists ? 'border-success/30 bg-success/5' : 'border-border bg-surface/50'}`}>
        {!allowManualUpload && !exists && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sistema
            </Badge>
          </div>
        )}
        
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className={`p-4 rounded-2xl transition-colors ${exists ? 'bg-success/20 text-success' : 'bg-background text-textSecondary'}`}>
            {icon}
          </div>
          
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">{type}</h3>
            <p className="text-xs text-textSecondary">
              {exists 
                ? 'Documento verificado y disponible' 
                : allowManualUpload 
                  ? 'Pendiente de carga manual' 
                  : 'Se genera al completar el proceso'}
            </p>
          </div>

          <div className="pt-2 w-full">
            {exists ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border hover:bg-primary/10" asChild>
                  <a href={doc.link_documento} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" /> Ver
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  className="px-3 text-error hover:bg-error/10 hover:text-error"
                  onClick={() => { setDocToDelete(doc); setIsDeleteAlertOpen(true); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              allowManualUpload ? (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 font-bold" 
                  onClick={() => handleUploadClick(type as ManualDocumentType)}
                  disabled={!selectedSocio}
                >
                  <Upload className="w-4 h-4 mr-2" /> Subir Archivo
                </Button>
              ) : (
                <div className="w-full py-2.5 px-3 bg-background/50 rounded-lg border border-border/50 flex items-center justify-center text-[11px] text-textSecondary font-medium select-none">
                  <Lock className="w-3.5 h-3.5 mr-2 opacity-50" />
                  Generación Automática
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="bg-surface border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-white">Gestión de Expedientes</CardTitle>
            <CardDescription>Busca un socio para administrar su documentación digital.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary" />
              <Input
                placeholder="DNI o Apellidos del socio..."
                className="pl-10 bg-background border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl max-h-64 overflow-auto p-2">
                  {searchResults.map((socio) => (
                    <div
                      key={socio.id}
                      className="px-4 py-3 hover:bg-primary/10 rounded-lg cursor-pointer transition-colors"
                      onClick={() => { setSelectedSocio(socio); setSearchQuery(''); setSearchResults([]); }}
                    >
                      <div className="font-bold text-white uppercase">{socio.nombres} {socio.apellidoPaterno}</div>
                      <div className="text-xs text-textSecondary">DNI: {socio.dni}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSocio ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">{selectedSocio.nombres} {selectedSocio.apellidoPaterno}</h2>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className="bg-surface text-textSecondary border-border">DNI: {selectedSocio.dni}</Badge>
                {selectedSocio.nro_recibo && <Badge className="bg-success/20 text-success border-success/30">Recibo: {selectedSocio.nro_recibo}</Badge>}
              </div>
            </div>
          </div>

          {loadingDocs ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* MANUALES: Solo estos dos permiten subida */}
              {renderDocumentCard('Planos de ubicación', <MapIcon className="h-8 w-8" />, true)}
              {renderDocumentCard('Memoria descriptiva', <FileText className="h-8 w-8" />, true)}
              
              {/* AUTOMÁTICOS: allowManualUpload es FALSE */}
              {renderDocumentCard('Contrato', <FileSignature className="h-8 w-8" />, false)}
              {renderDocumentCard('Ficha', <FileCheck className="h-8 w-8" />, false)}
              {renderDocumentCard('Comprobante de pago', <Receipt className="h-8 w-8" />, false)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-2xl bg-surface/30">
          <div className="bg-surface p-6 rounded-full shadow-inner mb-6">
            <Search className="h-10 w-10 text-textSecondary opacity-20" />
          </div>
          <h3 className="text-xl font-bold text-white">Selecciona un socio</h3>
          <p className="text-textSecondary max-w-xs mt-2">Busca un socio arriba para ver sus documentos y estado de expediente.</p>
        </div>
      )}

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        socioId={selectedSocio?.id}
        socioName={selectedSocio ? `${selectedSocio.nombres} ${selectedSocio.apellidoPaterno}` : ''}
        documentType={uploadDocType}
        onUploadSuccess={() => selectedSocio && loadDocuments(selectedSocio.id)}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Solicitar eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="text-textSecondary">
              Esta acción enviará una solicitud para eliminar el documento <span className="text-white font-bold">{docToDelete?.tipo_documento}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!docToDelete || !selectedSocio || !user) return;
                setIsRequestingDeletion(true);
                try {
                  await createDeletionRequest({
                    document_id: docToDelete.id.toString(),
                    document_type: docToDelete.tipo_documento,
                    document_link: docToDelete.link_documento,
                    socio_id: selectedSocio.id,
                    requested_by: user.id,
                    requested_by_email: user.email || 'unknown',
                  });
                  toast.success('Solicitud enviada');
                  setIsDeleteAlertOpen(false);
                } catch (e) { toast.error('Error al solicitar'); }
                finally { setIsRequestingDeletion(false); }
              }}
              className="bg-error hover:bg-error/90 text-white font-bold"
              disabled={isRequestingDeletion}
            >
              {isRequestingDeletion ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
