using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence;

/// <summary>
/// Seed inicial de Etapa 0: los 6 roles del sistema (SPEC.md §2.1) con su
/// NivelJerarquico (RN-ADM-01, §3.19) y un usuario SuperAdministrador para poder
/// loguearse apenas el entorno esté levantado.
///
/// Decisión de diseño: se corre como seeder imperativo en el arranque (Program.cs),
/// usando RoleManager/UserManager de Identity, en lugar de HasData en OnModelCreating —
/// HasData exigiría precalcular hashes de password y Ids fijos a mano, mientras que los
/// managers de Identity ya resuelven hashing, normalización y validación de la política
/// de contraseñas de forma consistente con el resto del sistema.
/// </summary>
public static class DbSeeder
{
    public const string SuperAdminEmail = "admin@clubunion.local";

    // Contraseña de desarrollo (Etapa 0) — cumple RN-LOG-01 (8+ caracteres, mayúscula,
    // minúscula y número). Cambiar en cualquier ambiente que no sea desarrollo local.
    public const string SuperAdminPasswordDev = "ClubUnion#2026";

    private static readonly (string Nombre, string? Descripcion, int NivelJerarquico, bool EsRolDeSistema)[] RolesDelSistema =
    [
        ("SuperAdministrador", "Control total, incluida la gestión de usuarios administrativos y Configuración.", 1, true),
        ("Administrador", "Todas las funcionalidades administrativas, excepto administración de usuarios administradores y Configuración crítica.", 2, true),
        ("EmpleadoSecretaria", "Rol operativo diario: atención al socio, cobranza, reservas, comunicaciones y portería.", 3, true),
        ("Instructor", "Acceso a un mini-portal con las actividades asignadas y sus inscriptos.", 3, true),
        ("Socio", "Portal del Socio (autogestión).", 4, true),
        ("NoSocio", "Páginas públicas y solicitud de membresía.", 5, true)
    ];

    // ---- Etapa 1: Categorías (SPEC.md §4.2 "Categoria") ----
    private static readonly (string Nombre, decimal ValorCuota)[] CategoriasIniciales =
    [
        ("Activo", 15000m),
        ("Vitalicio", 15000m),
        ("Cadete", 8000m),
        ("Estudiante", 5000m)
    ];

    // ---- Etapa 1: Coberturas Médicas + Planes (SPEC.md §4.2 "CoberturaMedica"/"Plan") ----
    private static readonly (string Nombre, string[] Planes)[] CoberturasIniciales =
    [
        ("OSDE", ["210", "310", "410"]),
        ("Swiss Medical", ["SMG02", "SMG20"]),
        ("Sin cobertura", [])
    ];

    // ---- Etapa 2: Amenities (SPEC.md §4.2 "Amenity") ----
    private static readonly string[] AmenitiesIniciales =
    [
        "Parrillero", "Climatizado", "Vestuarios", "Sonido", "Iluminación"
    ];

    // ---- Etapa 3: ConceptoIngresoLibre (SPEC.md §4.2 "ConceptoIngresoLibre", RN-FIN-09) ----
    private static readonly string[] ConceptosIngresoLibreIniciales =
    [
        "Jardín Maternal", "Eventos", "Otros"
    ];

    // ---- Etapa 1: Permisos (RBAC dinámico, SPEC.md §2.2/§4.2 "Permiso") ----
    private static readonly (string Codigo, string Descripcion, string Modulo)[] PermisosIniciales =
    [
        ("socios.crear", "Alta de socios.", "Socios"),
        ("socios.leer", "Consulta de socios.", "Socios"),
        ("socios.editar", "Edición de socios (incluye cambio de estado y reactivación).", "Socios"),
        ("socios.baja", "Baja lógica de socios.", "Socios"),

        ("grupos-familiares.crear", "Alta de grupos familiares.", "GruposFamiliares"),
        ("grupos-familiares.leer", "Consulta de grupos familiares.", "GruposFamiliares"),
        ("grupos-familiares.editar", "Edición de grupos familiares (integrantes, cambio de titular).", "GruposFamiliares"),
        ("grupos-familiares.baja", "Baja lógica de grupos familiares.", "GruposFamiliares"),

        ("categorias.crear", "Alta de categorías de socio.", "Categorias"),
        ("categorias.leer", "Consulta de categorías de socio.", "Categorias"),
        ("categorias.editar", "Edición de categorías de socio.", "Categorias"),
        ("categorias.baja", "Baja lógica de categorías de socio.", "Categorias"),

        ("coberturas-medicas.crear", "Alta de coberturas médicas y planes.", "CoberturasMedicas"),
        ("coberturas-medicas.leer", "Consulta de coberturas médicas y planes.", "CoberturasMedicas"),
        ("coberturas-medicas.editar", "Edición de coberturas médicas y planes.", "CoberturasMedicas"),
        ("coberturas-medicas.baja", "Baja lógica de coberturas médicas y planes.", "CoberturasMedicas"),

        // ---- Etapa 2 ----
        ("actividades.crear", "Alta de actividades.", "Actividades"),
        ("actividades.leer", "Consulta de actividades, divisiones e inscripciones.", "Actividades"),
        ("actividades.editar", "Edición de actividades, divisiones e instructores asignados.", "Actividades"),
        ("actividades.baja", "Baja de actividades y cancelación de inscripciones.", "Actividades"),

        ("instructores.crear", "Alta de instructores (crea también la cuenta de login).", "Instructores"),
        ("instructores.leer", "Consulta de instructores.", "Instructores"),
        ("instructores.editar", "Edición de instructores.", "Instructores"),
        ("instructores.baja", "Baja lógica de instructores.", "Instructores"),

        ("espacios.crear", "Alta de espacios.", "Espacios"),
        ("espacios.leer", "Consulta de espacios y su disponibilidad.", "Espacios"),
        ("espacios.editar", "Edición de espacios.", "Espacios"),
        ("espacios.baja", "Baja lógica de espacios.", "Espacios"),

        ("reservas.crear", "Alta de reservas de espacios.", "Reservas"),
        ("reservas.leer", "Consulta de reservas.", "Reservas"),
        ("reservas.editar", "Edición, confirmación y rechazo de reservas.", "Reservas"),
        ("reservas.baja", "Cancelación de reservas.", "Reservas"),

        ("amenities.crear", "Alta de amenities.", "Amenities"),
        ("amenities.leer", "Consulta de amenities.", "Amenities"),
        ("amenities.editar", "Edición de amenities.", "Amenities"),
        ("amenities.baja", "Baja de amenities.", "Amenities"),

        // ---- Etapa 3 ----
        ("cuotas.leer", "Consulta de cuotas y su desglose.", "Finanzas"),
        ("cuotas.generar", "Generación batch de cuotas por período.", "Finanzas"),
        ("pagos.crear", "Registro manual de pagos (cuotas, reservas, ingresos libres).", "Finanzas"),
        ("pagos.leer", "Consulta de pagos y comprobantes.", "Finanzas"),
        ("finanzas.reportes.leer", "Dashboard financiero y reportes de ingresos.", "Finanzas"),

        ("conceptos-ingreso-libre.crear", "Alta de conceptos de ingreso libre.", "Finanzas"),
        ("conceptos-ingreso-libre.leer", "Consulta de conceptos de ingreso libre.", "Finanzas"),
        ("conceptos-ingreso-libre.editar", "Edición de conceptos de ingreso libre.", "Finanzas"),
        ("conceptos-ingreso-libre.baja", "Baja de conceptos de ingreso libre.", "Finanzas"),

        ("configuracion.general.leer", "Consulta de la Configuración General del sistema.", "Configuracion"),
        ("configuracion.general.editar", "Edición de la Configuración General del sistema.", "Configuracion"),

        // ---- Etapa 4 ----
        ("comunicaciones.crear", "Alta de comunicaciones (borrador).", "Comunicaciones"),
        ("comunicaciones.leer", "Consulta de comunicaciones y su trazabilidad.", "Comunicaciones"),
        ("comunicaciones.editar", "Edición, envío, programación y adjuntos de comunicaciones.", "Comunicaciones"),
        ("comunicaciones.baja", "Eliminación de comunicaciones en Borrador.", "Comunicaciones"),

        ("consultas.crear", "Alta de consultas de socios (uso interno/backoffice).", "Consultas"),
        ("consultas.leer", "Consulta de las consultas de socios.", "Consultas"),
        ("consultas.editar", "Responder consultas de socios.", "Consultas"),

        // ---- Etapa 5 ----
        ("control-acceso.validar", "Validación de QR en portería (registra el intento de acceso).", "ControlAcceso"),
        ("control-acceso.leer", "Consulta del historial de accesos.", "ControlAcceso")
    ];

    // ---- Etapa 1: RolPermiso — SPEC.md §2.2 ----
    // SuperAdmin y Administrador: CLMB completo en los 4 módulos. Empleado/Secretaría: CLM
    // (sin B) en Socios/GruposFamiliares, solo L en Categorías/CoberturasMedicas.
    private static readonly string[] PermisosCLMBCompleto =
    [
        "socios.crear", "socios.leer", "socios.editar", "socios.baja",
        "grupos-familiares.crear", "grupos-familiares.leer", "grupos-familiares.editar", "grupos-familiares.baja",
        "categorias.crear", "categorias.leer", "categorias.editar", "categorias.baja",
        "coberturas-medicas.crear", "coberturas-medicas.leer", "coberturas-medicas.editar", "coberturas-medicas.baja"
    ];

    private static readonly string[] PermisosEmpleadoSecretaria =
    [
        "socios.crear", "socios.leer", "socios.editar",
        "grupos-familiares.crear", "grupos-familiares.leer", "grupos-familiares.editar",
        "categorias.leer",
        "coberturas-medicas.leer"
    ];

    // ---- Etapa 2: RolPermiso — SPEC.md §2.2 y enunciado de la tarea ----
    // SuperAdmin/Administrador: CLMB completo en Actividades/Espacios/Reservas (según el
    // enunciado) + Instructores/Amenities (no están en la matriz original de §2.2 por ser
    // NUEVO-SPEC; se les da el mismo tratamiento CLMB que a Categorías/CoberturasMedicas,
    // que tampoco están abiertas a Empleado más allá de lectura — decisión de
    // implementación, ver reporte final). Empleado: CLM (sin B) en Actividades, CLMB en
    // Reservas, L en Espacios (según el enunciado) + L en Instructores/Amenities (mismo
    // criterio que Categorías/CoberturasMedicas). Instructor: sin permiso de módulo
    // estándar — su acceso de solo lectura a "sus" actividades se resuelve en
    // InstructorPortalController vía rol, no vía RolPermiso/policy.
    private static readonly string[] PermisosActividadesEspaciosReservasCLMBCompleto =
    [
        "actividades.crear", "actividades.leer", "actividades.editar", "actividades.baja",
        "espacios.crear", "espacios.leer", "espacios.editar", "espacios.baja",
        "reservas.crear", "reservas.leer", "reservas.editar", "reservas.baja",
        "instructores.crear", "instructores.leer", "instructores.editar", "instructores.baja",
        "amenities.crear", "amenities.leer", "amenities.editar", "amenities.baja"
    ];

    private static readonly string[] PermisosEmpleadoSecretariaEtapa2 =
    [
        "actividades.crear", "actividades.leer", "actividades.editar",
        "reservas.crear", "reservas.leer", "reservas.editar", "reservas.baja",
        "espacios.leer",
        "instructores.leer",
        "amenities.leer"
    ];

    // ---- Etapa 3: RolPermiso — SPEC.md §2.2 filas "Finanzas — Cuotas/Pagos" y
    // "Finanzas — Reportes/Dashboard". SuperAdmin/Administrador: CLMB completo en
    // Cuotas/Pagos/ConceptoIngresoLibre + L en Reportes/Dashboard. Empleado: C (registrar
    // pago manual) + L en Cuotas/Pagos, sin acceso a Reportes/Dashboard ni al catálogo de
    // ConceptoIngresoLibre (matriz: "—"). Configuración General es exclusiva de SuperAdmin
    // (matriz: Administrador "—" en esa fila, RN-ADM-01 §3.19).
    private static readonly string[] PermisosFinanzasCLMBCompleto =
    [
        "cuotas.leer", "cuotas.generar",
        "pagos.crear", "pagos.leer",
        "finanzas.reportes.leer",
        "conceptos-ingreso-libre.crear", "conceptos-ingreso-libre.leer", "conceptos-ingreso-libre.editar", "conceptos-ingreso-libre.baja"
    ];

    private static readonly string[] PermisosFinanzasEmpleadoSecretaria =
    [
        "cuotas.leer",
        "pagos.crear", "pagos.leer"
    ];

    private static readonly string[] PermisosConfiguracionGeneralSoloSuperAdmin =
    [
        "configuracion.general.leer", "configuracion.general.editar"
    ];

    // ---- Etapa 4: RolPermiso — enunciado de la tarea (matriz §2.2 fila "Comunicaciones":
    // SuperAdmin/Administrador CLMB, Empleado/Secretaría "CLM sin eliminar"). "Consultas del
    // Socio" es NUEVO-SPEC-UI, sin fila propia en la matriz original — se le da CLM a los 3
    // roles de staff por igual (SuperAdmin/Administrador/Empleado), consistente con el
    // enunciado ("consultas.* (staff CLM...)"), sin distinguir jerarquía como en Comunicaciones.
    private static readonly string[] PermisosComunicacionesCLMBCompleto =
    [
        "comunicaciones.crear", "comunicaciones.leer", "comunicaciones.editar", "comunicaciones.baja"
    ];

    private static readonly string[] PermisosComunicacionesEmpleadoSecretaria =
    [
        "comunicaciones.crear", "comunicaciones.leer", "comunicaciones.editar"
    ];

    private static readonly string[] PermisosConsultasStaff =
    [
        "consultas.crear", "consultas.leer", "consultas.editar"
    ];

    // ---- Etapa 5: RolPermiso — SPEC.md §2.2 fila "Control de Acceso (QR)": SuperAdmin/
    // Administrador CLMB, Empleado "CL (operar portería)". No hay ABM de RegistroAcceso (solo
    // se crea internamente al validar), así que "CLMB" acá se traduce a los 2 únicos permisos
    // del módulo (validar equivale a "crear" el registro, leer al historial); B(aja) no
    // aplica. Instructor/Socio/NoSocio: sin acceso (matriz: "—").
    private static readonly string[] PermisosControlAccesoStaff =
    [
        "control-acceso.validar", "control-acceso.leer"
    ];

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        foreach (var (nombre, descripcion, nivel, esRolDeSistema) in RolesDelSistema)
        {
            if (await roleManager.FindByNameAsync(nombre) is not null)
            {
                continue;
            }

            var rol = new ApplicationRole
            {
                Id = Guid.NewGuid(),
                Name = nombre,
                Descripcion = descripcion,
                NivelJerarquico = nivel,
                EsRolDeSistema = esRolDeSistema,
                Estado = EstadoRol.Activo
            };

            var resultado = await roleManager.CreateAsync(rol);
            if (!resultado.Succeeded)
            {
                logger.LogError(
                    "No se pudo crear el rol {Rol}: {Errores}",
                    nombre,
                    string.Join("; ", resultado.Errors.Select(e => e.Description)));
            }
        }

        if (await userManager.FindByEmailAsync(SuperAdminEmail) is null)
        {
            var rolSuperAdmin = await roleManager.FindByNameAsync("SuperAdministrador");
            if (rolSuperAdmin is null)
            {
                logger.LogError("No se encontró el rol SuperAdministrador; no se pudo crear el usuario inicial.");
            }
            else
            {
                var superAdmin = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    UserName = SuperAdminEmail,
                    Email = SuperAdminEmail,
                    EmailConfirmed = true,
                    RolId = rolSuperAdmin.Id,
                    Estado = EstadoUsuario.Activo,
                    FechaCreacion = DateTime.UtcNow
                };

                var resultadoUsuario = await userManager.CreateAsync(superAdmin, SuperAdminPasswordDev);
                if (!resultadoUsuario.Succeeded)
                {
                    logger.LogError(
                        "No se pudo crear el usuario SuperAdministrador inicial: {Errores}",
                        string.Join("; ", resultadoUsuario.Errors.Select(e => e.Description)));
                }

                // Nota: deliberadamente NO se usa userManager.AddToRoleAsync (poblaría la tabla
                // estándar AspNetUserRoles). La autorización se resuelve exclusivamente contra
                // ApplicationUser.RolId, ya asignado arriba — ver enunciado de la tarea y
                // ApplicationUserConfiguration.
            }
        }

        // ---- Etapa 1: Categorías, Coberturas Médicas/Planes, Permisos y RolPermiso ----
        // Nota: se movieron fuera del "return" temprano de arriba (bug preexistente de
        // Etapa 0 que hacía que este seed nunca corriera una vez creado el SuperAdmin en el
        // primer arranque) para que corran siempre, de forma idempotente, en cada arranque.
        var dbContext = serviceProvider.GetRequiredService<ApplicationDbContext>();

        await SeedCategoriasAsync(dbContext);
        await SeedCoberturasMedicasAsync(dbContext);
        await SeedAmenitiesAsync(dbContext);
        await SeedConfiguracionGeneralAsync(dbContext);
        await SeedConceptosIngresoLibreAsync(dbContext);
        await SeedPermisosAsync(dbContext);
        await SeedRolPermisosAsync(dbContext, roleManager, logger);
    }

    // ---- Etapa 3: ConfiguracionGeneral (fila singleton, SPEC.md §4.2 "ConfiguracionGeneral") ----
    private static async Task SeedConfiguracionGeneralAsync(ApplicationDbContext dbContext)
    {
        if (await dbContext.ConfiguracionesGenerales.AnyAsync(c => c.Id == ConfiguracionGeneral.IdFijo))
        {
            return;
        }

        dbContext.ConfiguracionesGenerales.Add(new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales,
            TarifaPlanaGrupoImporte = null,
            ToleranciaAccesoDiasCuotaVencida = 10
        });

        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedConceptosIngresoLibreAsync(ApplicationDbContext dbContext)
    {
        foreach (var nombre in ConceptosIngresoLibreIniciales)
        {
            if (await dbContext.ConceptosIngresoLibre.AnyAsync(c => c.Nombre == nombre))
            {
                continue;
            }

            dbContext.ConceptosIngresoLibre.Add(new ConceptoIngresoLibre
            {
                Id = Guid.NewGuid(),
                Nombre = nombre,
                Estado = EstadoConceptoIngresoLibre.Activo
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedAmenitiesAsync(ApplicationDbContext dbContext)
    {
        foreach (var nombre in AmenitiesIniciales)
        {
            if (await dbContext.Amenities.AnyAsync(a => a.Nombre == nombre))
            {
                continue;
            }

            dbContext.Amenities.Add(new Amenity { Id = Guid.NewGuid(), Nombre = nombre });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedCategoriasAsync(ApplicationDbContext dbContext)
    {
        foreach (var (nombre, valorCuota) in CategoriasIniciales)
        {
            if (await dbContext.Categorias.AnyAsync(c => c.Nombre == nombre))
            {
                continue;
            }

            dbContext.Categorias.Add(new Categoria
            {
                Id = Guid.NewGuid(),
                Nombre = nombre,
                ValorCuota = valorCuota,
                Estado = EstadoCategoria.Activo
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedCoberturasMedicasAsync(ApplicationDbContext dbContext)
    {
        foreach (var (nombreCobertura, planes) in CoberturasIniciales)
        {
            var cobertura = await dbContext.CoberturasMedicas.FirstOrDefaultAsync(c => c.Nombre == nombreCobertura);
            if (cobertura is null)
            {
                cobertura = new CoberturaMedica
                {
                    Id = Guid.NewGuid(),
                    Nombre = nombreCobertura,
                    Estado = EstadoCoberturaMedica.Activo
                };
                dbContext.CoberturasMedicas.Add(cobertura);
                await dbContext.SaveChangesAsync();
            }

            foreach (var nombrePlan in planes)
            {
                var existePlan = await dbContext.Planes
                    .AnyAsync(p => p.CoberturaMedicaId == cobertura.Id && p.Nombre == nombrePlan);
                if (existePlan)
                {
                    continue;
                }

                dbContext.Planes.Add(new Plan
                {
                    Id = Guid.NewGuid(),
                    CoberturaMedicaId = cobertura.Id,
                    Nombre = nombrePlan,
                    Estado = EstadoPlan.Activo
                });
            }

            await dbContext.SaveChangesAsync();
        }
    }

    private static async Task SeedPermisosAsync(ApplicationDbContext dbContext)
    {
        foreach (var (codigo, descripcion, modulo) in PermisosIniciales)
        {
            if (await dbContext.Permisos.AnyAsync(p => p.Codigo == codigo))
            {
                continue;
            }

            dbContext.Permisos.Add(new Permiso
            {
                Id = Guid.NewGuid(),
                Codigo = codigo,
                Descripcion = descripcion,
                Modulo = modulo
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedRolPermisosAsync(
        ApplicationDbContext dbContext,
        RoleManager<ApplicationRole> roleManager,
        ILogger logger)
    {
        var asignaciones = new (string RolNombre, string[] Codigos)[]
        {
            ("SuperAdministrador", PermisosCLMBCompleto
                .Concat(PermisosActividadesEspaciosReservasCLMBCompleto)
                .Concat(PermisosFinanzasCLMBCompleto)
                .Concat(PermisosConfiguracionGeneralSoloSuperAdmin)
                .Concat(PermisosComunicacionesCLMBCompleto)
                .Concat(PermisosConsultasStaff)
                .Concat(PermisosControlAccesoStaff)
                .ToArray()),
            ("Administrador", PermisosCLMBCompleto
                .Concat(PermisosActividadesEspaciosReservasCLMBCompleto)
                .Concat(PermisosFinanzasCLMBCompleto)
                .Concat(PermisosComunicacionesCLMBCompleto)
                .Concat(PermisosConsultasStaff)
                .Concat(PermisosControlAccesoStaff)
                .ToArray()),
            ("EmpleadoSecretaria", PermisosEmpleadoSecretaria
                .Concat(PermisosEmpleadoSecretariaEtapa2)
                .Concat(PermisosFinanzasEmpleadoSecretaria)
                .Concat(PermisosComunicacionesEmpleadoSecretaria)
                .Concat(PermisosConsultasStaff)
                .Concat(PermisosControlAccesoStaff)
                .ToArray())
        };

        foreach (var (rolNombre, codigos) in asignaciones)
        {
            var rol = await roleManager.FindByNameAsync(rolNombre);
            if (rol is null)
            {
                logger.LogError("No se encontró el rol {Rol}; no se pudieron asignar sus permisos de Etapa 1.", rolNombre);
                continue;
            }

            foreach (var codigo in codigos)
            {
                var permiso = await dbContext.Permisos.FirstOrDefaultAsync(p => p.Codigo == codigo);
                if (permiso is null)
                {
                    continue;
                }

                var yaAsignado = await dbContext.RolPermisos
                    .AnyAsync(rp => rp.RolId == rol.Id && rp.PermisoId == permiso.Id);
                if (yaAsignado)
                {
                    continue;
                }

                dbContext.RolPermisos.Add(new RolPermiso { RolId = rol.Id, PermisoId = permiso.Id });
            }
        }

        await dbContext.SaveChangesAsync();
    }
}
