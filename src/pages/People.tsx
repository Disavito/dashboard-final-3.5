import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ColumnDef, 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  SortingState,
  VisibilityState,
  flexRender
} from '@tanstack/react-table';
import { 
  PlusCircle, 
  Loader2, 
  Edit, 
  Trash2, 
  Search, 
  Download, 
  ArrowUpDown,
  User,
  MapPin,
  FileText,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SocioTitular } from '@/lib/types';
import SocioTitularRegistrationForm from '@/components/custom/SocioTitularRegistrationForm';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Interfaz extendida para incluir los datos calculados
interface EnrichedSocio extends SocioTitular {
  isActive: boolean;
  receiptNumber: string;
  lastTransactionDate?: string;
}

function People() {
  const [socios, setSocios] = useState<EnrichedSocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<EnrichedSocio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtros y Estado de Tabla
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [socioToEdit, setSocioToEdit] = useState<EnrichedSocio | null>(null);

  const { loading: userLoading } = useUser();

  const fetchSocios = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sociosData, error: sociosError } = await supabase
        .from('socio_titulares')
        .select('*')
        .order('nombres', { ascending: true });

      if (sociosError) throw sociosError;

      const { data: ingresosData, error: ingresosError } = await supabase
        .from('ingresos')
        .select('dni, receipt_number, transaction_type, date, created_at');

      if (ingresosError) throw ingresosError;

      const ingresosMap = new Map<string, any[]>();
      ingresosData?.forEach(ingreso => {
        if (ingreso.dni) {
          const current = ingresosMap.get(ingreso.dni) || [];
          current.push(ingreso);
          ingresosMap.set(ingreso.dni, current);
        }
      });

      const enrichedSocios: EnrichedSocio[] = (sociosData || []).map(socio => {
        const socioIngresos = ingresosMap.get(socio.dni) || [];
        
        socioIngresos.sort((a, b) => {
          const dateA = new Date(a.date || a.created_at).getTime();
          const dateB = new Date(b.date || b.created_at).getTime();
          return dateB - dateA;
        });

        const lastTransaction = socioIngresos[0];
        
        let isActive = true;
        if (lastTransaction && lastTransaction.transaction_type?.toLowerCase().includes('anulacion')) {
          isActive = false;
        }

        const receiptNumber = lastTransaction ? lastTransaction.receipt_number : 'N/A';

        return {
          ...socio,
          isActive,
          receiptNumber,
          lastTransactionDate: lastTransaction?.date
        } as EnrichedSocio;
      });

      setSocios(enrichedSocios);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocios();
  }, [fetchSocios]);

  const localidades = useMemo(() => {
    const locs = new Set(socios.map(s => s.localidad).filter(Boolean));
    return Array.from(locs).sort();
  }, [socios]);

  const filteredData = useMemo(() => {
    return socios.filter(socio => {
      const searchStr = globalFilter.toLowerCase();
      const matchesSearch = 
        !globalFilter ||
        socio.nombres?.toLowerCase().includes(searchStr) ||
        socio.apellidoPaterno?.toLowerCase().includes(searchStr) ||
        socio.apellidoMaterno?.toLowerCase().includes(searchStr) ||
        socio.dni?.includes(searchStr) ||
        socio.localidad?.toLowerCase().includes(searchStr) ||
        socio.mz?.toLowerCase().includes(searchStr) ||
        socio.lote?.toLowerCase().includes(searchStr) ||
        socio.receiptNumber?.toLowerCase().includes(searchStr);

      const matchesLocalidad = selectedLocalidad === 'all' || socio.localidad === selectedLocalidad;
      const matchesEstado = selectedEstado === 'all' || 
        (selectedEstado === 'active' && socio.isActive) ||
        (selectedEstado === 'inactive' && !socio.isActive);

      return matchesSearch && matchesLocalidad && matchesEstado;
    });
  }, [socios, globalFilter, selectedLocalidad, selectedEstado]);

  const exportToCSV = () => {
    const headers = ['DNI', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Celular', 'Localidad', 'Mz', 'Lote', 'N° Recibo', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.dni,
        `"${row.nombres}"`,
        `"${row.apellidoPaterno}"`,
        `"${row.apellidoMaterno}"`,
        row.celular || '',
        `"${row.localidad}"`,
        row.mz || '',
        row.lote || '',
        row.receiptNumber !== 'N/A' ? row.receiptNumber : '',
        row.isActive ? 'Activo' : 'Inactivo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `socios_titulares_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns: ColumnDef<EnrichedSocio>[] = useMemo(() => [
    {
      accessorKey: 'dni',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          DNI <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-sm text-gray-900">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'nombres',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Nombres <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium uppercase text-gray-900">{row.getValue('nombres')}</span>,
    },
    {
      accessorKey: 'apellidoPaterno',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Apellido Paterno <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="uppercase text-gray-900">{row.getValue('apellidoPaterno')}</span>,
    },
    {
      accessorKey: 'apellidoMaterno',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Apellido Materno <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="uppercase text-gray-900">{row.getValue('apellidoMaterno')}</span>,
    },
    {
      accessorKey: 'celular',
      header: 'Celular',
      cell: ({ row }) => <span className="text-gray-500">{row.getValue('celular') || 'N/A'}</span>,
    },
    {
      accessorKey: 'localidad',
      header: 'Localidad',
      cell: ({ row }) => <span className="uppercase text-xs font-semibold text-gray-700">{row.getValue('localidad')}</span>,
    },
    {
      accessorKey: 'mz',
      header: 'Mz',
      cell: ({ row }) => <span className="font-mono text-gray-700">{row.getValue('mz') || '-'}</span>,
    },
    {
      accessorKey: 'lote',
      header: 'Lote',
      cell: ({ row }) => <span className="font-mono text-gray-700">{row.getValue('lote') || '-'}</span>,
    },
    {
      accessorKey: 'receiptNumber',
      header: 'N° Recibo',
      cell: ({ row }) => <span className="text-gray-600 text-sm font-mono">{row.original.receiptNumber}</span>,
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <Button variant="ghost" className="pl-0 hover:bg-transparent font-semibold text-gray-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Estado <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "font-medium border-0 px-3 py-1 rounded-full text-xs",
              isActive 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-red-100 text-red-700"
            )}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-pink-400 hover:text-pink-600 hover:bg-pink-50"
            onClick={() => { setSocioToEdit(row.original); setIsEditDialogOpen(true); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => { setSocioToDelete(row.original); setIsDeleteDialogOpen(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
  });

  if (loading || userLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-white pb-10">
      {/* Banner Header */}
      <div className="w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 py-12 md:py-16 px-6 md:px-12 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pattern-grid-lg opacity-10"></div>
        <div className="max-w-7xl mx-auto text-center text-white space-y-3 relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight drop-shadow-sm">Gestión de Socios Titulares</h1>
          <p className="text-blue-50 text-base md:text-lg font-light max-w-2xl mx-auto drop-shadow-sm opacity-90">
            Administra la información de todos los socios registrados.
          </p>
        </div>
      </div>

      <div className="max-w-[98%] mx-auto space-y-6 px-4">
        {/* Toolbar Card */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar socio..." 
              className="pl-10 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all h-10 rounded-md shadow-sm" 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Select value={selectedLocalidad} onValueChange={setSelectedLocalidad}>
              <SelectTrigger className="w-full md:w-[220px] h-10 bg-white border-gray-200 rounded-md shadow-sm">
                <SelectValue placeholder="Comunidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Comunidades</SelectItem>
                {localidades.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger className="w-full md:w-[180px] h-10 bg-white border-gray-200 rounded-md shadow-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <Button 
              variant="outline"
              className="h-10 border-gray-200 text-gray-600 gap-2 rounded-md font-medium shadow-sm hidden md:flex"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button 
              className="h-10 bg-[#a855f7] hover:bg-[#9333ea] text-white gap-2 rounded-md font-medium shadow-sm w-full md:w-auto"
              onClick={() => setIsRegistrationDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Nuevo Socio
            </Button>
          </div>
        </div>

        {/* VISTA ESCRITORIO */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-gray-100">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-12 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">No se encontraron resultados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 bg-white">
            <div className="text-xs text-gray-500">Mostrando {table.getRowModel().rows.length} de {filteredData.length} registros</div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 px-3">Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 px-3">Siguiente</Button>
            </div>
          </div>
        </div>

        {/* VISTA MÓVIL */}
        <div className="grid gap-4 md:hidden">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const socio = row.original;
              return (
                <Card key={socio.id} className="w-full bg-white border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex flex-row items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">DNI</span>
                        <span className="text-sm font-mono font-bold text-gray-900">{socio.dni}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-bold border-0 px-3 py-1 rounded-full text-[10px] uppercase",
                        socio.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {socio.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Socio Titular</span>
                      <span className="font-black text-gray-900 text-lg leading-tight uppercase">
                        {socio.nombres} {socio.apellidoPaterno} {socio.apellidoMaterno}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <MapPin className="h-3 w-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Comunidad</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 block truncate uppercase">{socio.localidad}</span>
                        <span className="text-xs text-gray-500 font-mono">Mz: {socio.mz || '-'} Lote: {socio.lote || '-'}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <FileText className="h-3 w-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Último Recibo</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-blue-600 block">{socio.receiptNumber}</span>
                      </div>
                    </div>

                    {socio.celular && (
                      <div className="flex items-center gap-2 pt-2 text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm font-medium">{socio.celular}</span>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-50 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 text-blue-600 border-blue-100 hover:bg-blue-50 rounded-xl font-bold"
                        onClick={() => { setSocioToEdit(socio); setIsEditDialogOpen(true); }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-red-500 border-red-100 hover:bg-red-50 rounded-xl"
                        onClick={() => { setSocioToDelete(socio); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">No se encontraron socios</p>
            </div>
          )}
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-gray-200">
          <SocioTitularRegistrationForm onClose={() => setIsRegistrationDialogOpen(false)} onSuccess={() => { setIsRegistrationDialogOpen(false); fetchSocios(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-gray-200">
          {socioToEdit && <SocioTitularRegistrationForm socioId={socioToEdit.id} onClose={() => setIsEditDialogOpen(false)} onSuccess={() => { setIsEditDialogOpen(false); fetchSocios(); }} />}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen} 
        onClose={() => setIsDeleteDialogOpen(false)} 
        onConfirm={async () => {
          if (!socioToDelete) return;
          setIsDeleting(true);
          const { error } = await supabase.from('socio_titulares').delete().eq('id', socioToDelete.id);
          if (!error) { toast.success('Socio eliminado'); fetchSocios(); setIsDeleteDialogOpen(false); }
          setIsDeleting(false);
        }} 
        title="Eliminar Socio" 
        description="¿Estás seguro? Esta acción no se puede deshacer."
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default People;
