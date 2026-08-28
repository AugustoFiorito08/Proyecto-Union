using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddActividadesEspaciosReservas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Amenities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Amenities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Espacios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Ubicacion = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Capacidad = table.Column<int>(type: "integer", nullable: false),
                    Precio = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnidadPrecio = table.Column<int>(type: "integer", nullable: false),
                    SolicitarEvaluacion = table.Column<bool>(type: "boolean", nullable: false),
                    PermitirNoSocios = table.Column<bool>(type: "boolean", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    ImagenUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PoliticaCancelacionHoras = table.Column<int>(type: "integer", nullable: false),
                    PorcentajeReembolso = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Espacios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Instructores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Apellido = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Nombres = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DNI = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Especialidad = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Instructores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Instructores_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Actividades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CategoriaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EspacioId = table.Column<Guid>(type: "uuid", nullable: true),
                    Precio = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ModalidadInscripcion = table.Column<int>(type: "integer", nullable: false),
                    CupoMinimo = table.Column<int>(type: "integer", nullable: false),
                    CupoMaximo = table.Column<int>(type: "integer", nullable: false),
                    Dias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    HorarioInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    HorarioFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Duracion = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    ImagenUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaUltimaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Actividades", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Actividades_Categorias_CategoriaId",
                        column: x => x.CategoriaId,
                        principalTable: "Categorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Actividades_Espacios_EspacioId",
                        column: x => x.EspacioId,
                        principalTable: "Espacios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EspacioAmenities",
                columns: table => new
                {
                    EspacioId = table.Column<Guid>(type: "uuid", nullable: false),
                    AmenityId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EspacioAmenities", x => new { x.EspacioId, x.AmenityId });
                    table.ForeignKey(
                        name: "FK_EspacioAmenities_Amenities_AmenityId",
                        column: x => x.AmenityId,
                        principalTable: "Amenities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EspacioAmenities_Espacios_EspacioId",
                        column: x => x.EspacioId,
                        principalTable: "Espacios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reservas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: true),
                    NombreContacto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TelefonoContacto = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    EmailContacto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EspacioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HoraInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    HoraFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Duracion = table.Column<int>(type: "integer", nullable: false),
                    TipoReserva = table.Column<int>(type: "integer", nullable: false),
                    CantidadInvitados = table.Column<int>(type: "integer", nullable: true),
                    Observaciones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    MotivoRechazo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reservas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reservas_Espacios_EspacioId",
                        column: x => x.EspacioId,
                        principalTable: "Espacios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Reservas_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ActividadInstructores",
                columns: table => new
                {
                    ActividadId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstructorId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActividadInstructores", x => new { x.ActividadId, x.InstructorId });
                    table.ForeignKey(
                        name: "FK_ActividadInstructores_Actividades_ActividadId",
                        column: x => x.ActividadId,
                        principalTable: "Actividades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActividadInstructores_Instructores_InstructorId",
                        column: x => x.InstructorId,
                        principalTable: "Instructores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DivisionesDeportivas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActividadId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EdadMinima = table.Column<int>(type: "integer", nullable: true),
                    EdadMaxima = table.Column<int>(type: "integer", nullable: true),
                    Genero = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Dias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    HorarioInicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    HorarioFin = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DivisionesDeportivas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DivisionesDeportivas_Actividades_ActividadId",
                        column: x => x.ActividadId,
                        principalTable: "Actividades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DivisionInstructores",
                columns: table => new
                {
                    DivisionDeportivaId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstructorId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DivisionInstructores", x => new { x.DivisionDeportivaId, x.InstructorId });
                    table.ForeignKey(
                        name: "FK_DivisionInstructores_DivisionesDeportivas_DivisionDeportiva~",
                        column: x => x.DivisionDeportivaId,
                        principalTable: "DivisionesDeportivas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DivisionInstructores_Instructores_InstructorId",
                        column: x => x.InstructorId,
                        principalTable: "Instructores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Inscripciones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActividadId = table.Column<Guid>(type: "uuid", nullable: false),
                    DivisionDeportivaId = table.Column<Guid>(type: "uuid", nullable: true),
                    FechaInscripcion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inscripciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Inscripciones_Actividades_ActividadId",
                        column: x => x.ActividadId,
                        principalTable: "Actividades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Inscripciones_DivisionesDeportivas_DivisionDeportivaId",
                        column: x => x.DivisionDeportivaId,
                        principalTable: "DivisionesDeportivas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Inscripciones_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Actividades_CategoriaId",
                table: "Actividades",
                column: "CategoriaId");

            migrationBuilder.CreateIndex(
                name: "IX_Actividades_EspacioId",
                table: "Actividades",
                column: "EspacioId");

            migrationBuilder.CreateIndex(
                name: "IX_Actividades_Estado",
                table: "Actividades",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_ActividadInstructores_InstructorId",
                table: "ActividadInstructores",
                column: "InstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_Amenities_Nombre",
                table: "Amenities",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DivisionesDeportivas_ActividadId",
                table: "DivisionesDeportivas",
                column: "ActividadId");

            migrationBuilder.CreateIndex(
                name: "IX_DivisionInstructores_InstructorId",
                table: "DivisionInstructores",
                column: "InstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_EspacioAmenities_AmenityId",
                table: "EspacioAmenities",
                column: "AmenityId");

            migrationBuilder.CreateIndex(
                name: "IX_Espacios_Estado",
                table: "Espacios",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_Espacios_Tipo",
                table: "Espacios",
                column: "Tipo");

            migrationBuilder.CreateIndex(
                name: "IX_Inscripciones_ActividadId",
                table: "Inscripciones",
                column: "ActividadId");

            migrationBuilder.CreateIndex(
                name: "IX_Inscripciones_DivisionDeportivaId",
                table: "Inscripciones",
                column: "DivisionDeportivaId");

            migrationBuilder.CreateIndex(
                name: "IX_Inscripciones_SocioId_ActividadId",
                table: "Inscripciones",
                columns: new[] { "SocioId", "ActividadId" },
                unique: true,
                filter: "\"Estado\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Instructores_DNI",
                table: "Instructores",
                column: "DNI",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Instructores_Email",
                table: "Instructores",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Instructores_UsuarioId",
                table: "Instructores",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reservas_EspacioId_Fecha_Estado",
                table: "Reservas",
                columns: new[] { "EspacioId", "Fecha", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_Reservas_SocioId",
                table: "Reservas",
                column: "SocioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActividadInstructores");

            migrationBuilder.DropTable(
                name: "DivisionInstructores");

            migrationBuilder.DropTable(
                name: "EspacioAmenities");

            migrationBuilder.DropTable(
                name: "Inscripciones");

            migrationBuilder.DropTable(
                name: "Reservas");

            migrationBuilder.DropTable(
                name: "Instructores");

            migrationBuilder.DropTable(
                name: "Amenities");

            migrationBuilder.DropTable(
                name: "DivisionesDeportivas");

            migrationBuilder.DropTable(
                name: "Actividades");

            migrationBuilder.DropTable(
                name: "Espacios");
        }
    }
}
