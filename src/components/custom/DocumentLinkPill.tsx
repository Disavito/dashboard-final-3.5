import React from 'react';
import { FileText, FileImage, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DocumentLinkPillProps {
  type: string;
  link: string | null;
  isAdmin?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
}

const DocumentLinkPill: React.FC<DocumentLinkPillProps> = ({ type, link, isAdmin, canDelete, onDelete }) => {
  const getIcon = (documentType: string) => {
    switch (documentType) {
      case 'Planos de ubicación':
        return <FileImage className="h-4 w-4 text-blue-500" />;
      case 'Memoria descriptiva':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'Ficha':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'Contrato':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'Comprobante de Pago':
      case 'Recibo':
        return <FileText className="h-4 w-4 text-emerald-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!link) {
    return (
      <div className="flex items-center gap-1 bg-gray-50 text-gray-400 rounded-lg pr-2 pl-2 py-1 text-[11px] font-medium border border-gray-100 cursor-not-allowed opacity-60">
        {getIcon(type)}
        <span className="truncate max-w-[100px]">{type.split(' ')[0]}...</span>
      </div>
    );
  }

  // Se puede borrar si es admin O si explícitamente se pasa canDelete
  const isDeletable = (isAdmin || canDelete) && onDelete;

  return (
    <div className="flex items-center gap-1 bg-white text-gray-700 rounded-lg pr-1 pl-2 py-1 text-[11px] font-medium border border-gray-200 group hover:border-[#9E7FFF]/50 hover:bg-[#F0EEFF]/50 transition-all duration-200 shadow-sm">
      <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        {getIcon(type)}
        <span className="truncate max-w-[100px]">{type.split(' ')[0]}...</span>
      </a>
      
      {isDeletable && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 ml-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-white text-gray-900 border-gray-200 shadow-xl">
              <p className="text-[10px] font-bold">Eliminar documento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default DocumentLinkPill;
