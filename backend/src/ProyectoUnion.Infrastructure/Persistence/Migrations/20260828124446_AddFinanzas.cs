using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanzas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConceptosIngresoLibre",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConceptosIngresoLibre", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ConfiguracionesGenerales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MaximaDeudaEnMeses = table.Column<int>(type: "integer", nullable: false),
                    TipoTarifaFamiliar = table.Column<int>(type: "integer", nullable: false),
                    TarifaPlanaGrupoImporte = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracionesGenerales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cuotas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: true),
                    GrupoFamiliarId = table.Column<Guid>(type: "uuid", nullable: true),
                    NumeroCuota = table.Column<int>(type: "integer", nullable: false),
                    Periodo = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    FechaVencimiento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RecargoMora = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cuotas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cuotas_GruposFamiliares_GrupoFamiliarId",
                        column: x => x.GrupoFamiliarId,
                        principalTable: "GruposFamiliares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cuotas_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CuotaDetalles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CuotaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Concepto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActividadId = table.Column<Guid>(type: "uuid", nullable: true),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: true),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CuotaDetalles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CuotaDetalles_Actividades_ActividadId",
                        column: x => x.ActividadId,
                        principalTable: "Actividades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CuotaDetalles_Cuotas_CuotaId",
                        column: x => x.CuotaId,
                        principalTable: "Cuotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CuotaDetalles_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Pagos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: true),
                    CuotaId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReservaId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConceptoIngresoLibreId = table.Column<Guid>(type: "uuid", nullable: true),
                    Concepto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Importe = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MedioPago = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    MercadoPagoTransaccionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ComprobanteUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pagos", x => x.Id);
                    table.CheckConstraint("CK_Pago_ExactamenteUnOrigen", "(CASE WHEN \"CuotaId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"ReservaId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"ConceptoIngresoLibreId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");
                    table.ForeignKey(
                        name: "FK_Pagos_ConceptosIngresoLibre_ConceptoIngresoLibreId",
                        column: x => x.ConceptoIngresoLibreId,
                        principalTable: "ConceptosIngresoLibre",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pagos_Cuotas_CuotaId",
                        column: x => x.CuotaId,
                        principalTable: "Cuotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pagos_Reservas_ReservaId",
                        column: x => x.ReservaId,
                        principalTable: "Reservas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pagos_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConceptosIngresoLibre_Nombre",
                table: "ConceptosIngresoLibre",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CuotaDetalles_ActividadId",
                table: "CuotaDetalles",
                column: "ActividadId");

            migrationBuilder.CreateIndex(
                name: "IX_CuotaDetalles_CuotaId",
                table: "CuotaDetalles",
                column: "CuotaId");

            migrationBuilder.CreateIndex(
                name: "IX_CuotaDetalles_SocioId",
                table: "CuotaDetalles",
                column: "SocioId");

            migrationBuilder.CreateIndex(
                name: "IX_Cuotas_Estado_FechaVencimiento",
                table: "Cuotas",
                columns: new[] { "Estado", "FechaVencimiento" });

            migrationBuilder.CreateIndex(
                name: "IX_Cuotas_GrupoFamiliarId_Periodo",
                table: "Cuotas",
                columns: new[] { "GrupoFamiliarId", "Periodo" },
                unique: true,
                filter: "\"GrupoFamiliarId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Cuotas_SocioId_Periodo",
                table: "Cuotas",
                columns: new[] { "SocioId", "Periodo" },
                unique: true,
                filter: "\"SocioId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_ConceptoIngresoLibreId",
                table: "Pagos",
                column: "ConceptoIngresoLibreId");

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_CuotaId",
                table: "Pagos",
                column: "CuotaId");

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_Estado_Fecha",
                table: "Pagos",
                columns: new[] { "Estado", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_MercadoPagoTransaccionId",
                table: "Pagos",
                column: "MercadoPagoTransaccionId");

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_ReservaId",
                table: "Pagos",
                column: "ReservaId");

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_SocioId",
                table: "Pagos",
                column: "SocioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracionesGenerales");

            migrationBuilder.DropTable(
                name: "CuotaDetalles");

            migrationBuilder.DropTable(
                name: "Pagos");

            migrationBuilder.DropTable(
                name: "ConceptosIngresoLibre");

            migrationBuilder.DropTable(
                name: "Cuotas");
        }
    }
}
