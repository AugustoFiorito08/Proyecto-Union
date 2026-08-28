using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddComunicaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Comunicaciones",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Asunto = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ContenidoHtml = table.Column<string>(type: "text", nullable: false),
                    TipoComunicacion = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaProgramada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreadoPorUsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaUltimoEnvio = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comunicaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comunicaciones_AspNetUsers_CreadoPorUsuarioId",
                        column: x => x.CreadoPorUsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ConsultasSocio",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Area = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Asunto = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Detalle = table.Column<string>(type: "text", nullable: false),
                    AdjuntoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RespondidoPorUsuarioId = table.Column<Guid>(type: "uuid", nullable: true),
                    FechaRespuesta = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Respuesta = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsultasSocio", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsultasSocio_AspNetUsers_RespondidoPorUsuarioId",
                        column: x => x.RespondidoPorUsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ConsultasSocio_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ComunicacionesAdjuntos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ComunicacionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArchivoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NombreArchivo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComunicacionesAdjuntos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComunicacionesAdjuntos_Comunicaciones_ComunicacionId",
                        column: x => x.ComunicacionId,
                        principalTable: "Comunicaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ComunicacionesDestinatarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ComunicacionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Canal = table.Column<int>(type: "integer", nullable: false),
                    EstadoEnvio = table.Column<int>(type: "integer", nullable: false),
                    FechaEnvio = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FechaLectura = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MotivoFallo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComunicacionesDestinatarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComunicacionesDestinatarios_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ComunicacionesDestinatarios_Comunicaciones_ComunicacionId",
                        column: x => x.ComunicacionId,
                        principalTable: "Comunicaciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Comunicaciones_CreadoPorUsuarioId",
                table: "Comunicaciones",
                column: "CreadoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Comunicaciones_Estado",
                table: "Comunicaciones",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_Comunicaciones_FechaProgramada",
                table: "Comunicaciones",
                column: "FechaProgramada");

            migrationBuilder.CreateIndex(
                name: "IX_ComunicacionesAdjuntos_ComunicacionId",
                table: "ComunicacionesAdjuntos",
                column: "ComunicacionId");

            migrationBuilder.CreateIndex(
                name: "IX_ComunicacionesDestinatarios_ComunicacionId",
                table: "ComunicacionesDestinatarios",
                column: "ComunicacionId");

            migrationBuilder.CreateIndex(
                name: "IX_ComunicacionesDestinatarios_EstadoEnvio",
                table: "ComunicacionesDestinatarios",
                column: "EstadoEnvio");

            migrationBuilder.CreateIndex(
                name: "IX_ComunicacionesDestinatarios_UsuarioId_Canal",
                table: "ComunicacionesDestinatarios",
                columns: new[] { "UsuarioId", "Canal" });

            migrationBuilder.CreateIndex(
                name: "IX_ConsultasSocio_Estado",
                table: "ConsultasSocio",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultasSocio_RespondidoPorUsuarioId",
                table: "ConsultasSocio",
                column: "RespondidoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultasSocio_SocioId",
                table: "ConsultasSocio",
                column: "SocioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComunicacionesAdjuntos");

            migrationBuilder.DropTable(
                name: "ComunicacionesDestinatarios");

            migrationBuilder.DropTable(
                name: "ConsultasSocio");

            migrationBuilder.DropTable(
                name: "Comunicaciones");
        }
    }
}
