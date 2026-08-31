import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { Instructor } from "@/lib/types";
import { EditarInstructorForm } from "./editar-instructor-form";

export const dynamic = "force-dynamic";

interface EditarInstructorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarInstructorPage({ params }: EditarInstructorPageProps) {
  const { id } = await params;

  let instructor: Instructor;
  try {
    instructor = await apiFetch<Instructor>(`/api/instructores/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Editar instructor — {instructor.apellido}, {instructor.nombres}
        </h2>
        <p className="mt-0.5 text-muted-foreground">Actualizá los datos de contacto.</p>
      </div>

      <EditarInstructorForm instructor={instructor} />
    </div>
  );
}
