import { Badge } from "@/components/ui/badge";

// `<StatusBadge />` genérico (SPEC.md §7.2): un componente parametrizable
// para cualquier estado de dominio (Socio, GrupoFamiliar, Categoria,
// CoberturaMedica, Actividad, DivisionDeportiva, Instructor, Espacio,
// Reserva, ...). Se extiende con más mapeos a medida que se agregan módulos.
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Activo: "default",
  Suspendido: "destructive",
  Inactivo: "secondary",
  Vigente: "default",
  ProximaAVencer: "secondary",
  Vencida: "destructive",
  // Actividad / DivisionDeportiva
  Activa: "default",
  Suspendida: "destructive",
  Finalizada: "secondary",
  // Reserva
  PendienteConfirmacion: "secondary",
  Confirmada: "default",
  Rechazada: "destructive",
  Pagada: "default",
  Cancelada: "outline",
  // Cuota / Pago (Etapa 3, SPEC.md §4.2) — "Pagada"/"Vencida"/"Rechazada" ya cubiertos arriba.
  Pendiente: "secondary",
  PendienteReembolso: "outline",
  // Comunicacion (Etapa 4) — "Pendiente" ya cubierto arriba.
  Borrador: "secondary",
  Programada: "outline",
  Enviada: "default",
  // ComunicacionDestinatario.EstadoEnvio (Etapa 4)
  Enviado: "default",
  Fallido: "destructive",
  // ConsultaSocio.Estado (Etapa 4) — "Pendiente" ya cubierto arriba.
  Respondida: "default",
  Cerrada: "secondary",
  // RegistroAcceso.Resultado (Etapa 5)
  Permitido: "default",
  Denegado: "destructive",
  // SolicitudMembresia.Estado (Etapa 6) — "Pendiente"/"Rechazada" ya cubiertos arriba.
  Aprobada: "default",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>{status}</Badge>;
}
